#!/usr/bin/env tsx
/**
 * scripts/post-to-bimmerpost.ts
 *
 * Reads the [Unreleased] section of CHANGELOG.md, converts it to BBCode,
 * and posts it as a reply to the registry's BimmerPost thread.
 *
 * After posting, marks the section as [YYYY-MM-DD] — <post url> in CHANGELOG.md.
 *
 * Usage:
 *   npx tsx scripts/post-to-bimmerpost.ts            # post and update changelog
 *   npx tsx scripts/post-to-bimmerpost.ts --dry-run  # preview BBCode, no post
 *
 * Required env vars (in .env.local or shell):
 *   BIMMERPOST_USERNAME
 *   BIMMERPOST_PASSWORD
 */

import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// Load .env.local so the script works without inline env vars
const envFile = join(ROOT, '.env.local');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf-8').split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
  }
}

const MAX_POST_LENGTH = 10_000;

const FORUM_BASE = 'https://g80.bimmerpost.com/forums';
const THREAD_ID = '2237372';
const THREAD_ANCHOR_POST = '32758986'; // p= value used to fetch the reply form

// ─── Cookie jar ───────────────────────────────────────────────────────────────

class CookieJar {
  private jar = new Map<string, string>();

  absorb(headers: Headers): void {
    const cookies: string[] = (headers as unknown as { getSetCookie?(): string[] })
      .getSetCookie?.() ?? [];
    // Fallback for environments without getSetCookie
    if (cookies.length === 0) {
      const single = headers.get('set-cookie');
      if (single) cookies.push(single);
    }
    for (const raw of cookies) {
      const [pair] = raw.split(';');
      const eqIdx = pair.indexOf('=');
      if (eqIdx === -1) continue;
      const name = pair.slice(0, eqIdx).trim();
      const value = pair.slice(eqIdx + 1).trim();
      if (name) this.jar.set(name, value);
    }
  }

  header(): string {
    return Array.from(this.jar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
  }

  get(name: string): string | undefined {
    return this.jar.get(name);
  }
}

// ─── vBulletin auth + post ─────────────────────────────────────────────────────

function md5(s: string): string {
  return createHash('md5').update(s, 'utf8').digest('hex');
}

async function login(jar: CookieJar): Promise<void> {
  const username = process.env.BIMMERPOST_USERNAME;
  const password = process.env.BIMMERPOST_PASSWORD;
  if (!username || !password) {
    throw new Error(
      'BIMMERPOST_USERNAME and BIMMERPOST_PASSWORD must be set (check .env.local).'
    );
  }

  // Fetch login page to pick up the initial session cookie
  const initRes = await fetch(`${FORUM_BASE}/login.php`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bmwic-registry-bot/1.0)' },
  });
  jar.absorb(initRes.headers);

  const body = new URLSearchParams({
    do: 'login',
    url: '/',
    vb_login_username: username,
    vb_login_password: '',
    vb_login_md5password: md5(password),
    vb_login_md5password_utf: md5(password),
    cookieuser: '1',
    securitytoken: 'guest',
  });

  const loginRes = await fetch(`${FORUM_BASE}/login.php?do=login`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': jar.header(),
      'User-Agent': 'Mozilla/5.0 (compatible; bmwic-registry-bot/1.0)',
      'Referer': `${FORUM_BASE}/login.php`,
    },
    body: body.toString(),
  });
  jar.absorb(loginRes.headers);

  // Follow any redirect to pick up final session cookies
  const redirectUrl = loginRes.headers.get('location');
  if (redirectUrl) {
    const absUrl = redirectUrl.startsWith('http')
      ? redirectUrl
      : `${FORUM_BASE}/${redirectUrl.replace(/^\//, '')}`;
    const rRes = await fetch(absUrl, {
      headers: {
        'Cookie': jar.header(),
        'User-Agent': 'Mozilla/5.0 (compatible; bmwic-registry-bot/1.0)',
      },
    });
    jar.absorb(rRes.headers);
  }

  // vBulletin sets bbsessionhash for guests too, so only bbuserid (non-zero)
  // reliably indicates an authenticated session.
  const bbuserid = jar.get('bbuserid');
  if (!bbuserid || bbuserid === '0') {
    throw new Error(
      'Login failed — bbuserid cookie missing or zero. Check BIMMERPOST_USERNAME/PASSWORD.'
    );
  }
}

interface ReplyFormFields {
  securitytoken: string;
  posthash: string;
  poststarttime: string;
  loggedinuser: string;
  subject: string;
}

// Extracts a hidden <input> value by name, tolerating either attribute order
// (name="x" value="y" or value="y" name="x") since vBulletin templates vary.
function getInputValue(html: string, name: string): string {
  const nameFirst = new RegExp(`<input[^>]*name="${name}"[^>]*value="([^"]*)"`, 'i');
  const valueFirst = new RegExp(`<input[^>]*value="([^"]*)"[^>]*name="${name}"`, 'i');
  return html.match(nameFirst)?.[1] ?? html.match(valueFirst)?.[1] ?? '';
}

async function fetchReplyForm(jar: CookieJar): Promise<ReplyFormFields> {
  const res = await fetch(
    `${FORUM_BASE}/newreply.php?do=newreply&noquote=1&p=${THREAD_ANCHOR_POST}`,
    {
      headers: {
        'Cookie': jar.header(),
        'User-Agent': 'Mozilla/5.0 (compatible; bmwic-registry-bot/1.0)',
      },
    }
  );
  jar.absorb(res.headers);
  const html = await res.text();

  const get = (name: string) => getInputValue(html, name);

  const securitytoken = get('securitytoken');
  if (!securitytoken || securitytoken === 'guest') {
    throw new Error(
      'Could not get securitytoken from reply form — login may have failed.'
    );
  }

  const posthash = get('posthash');
  if (!posthash) {
    throw new Error(
      'Could not get posthash from reply form — login may have failed or the form structure changed.'
    );
  }

  const poststarttime = get('poststarttime');
  if (!poststarttime) {
    throw new Error(
      'Could not get poststarttime from reply form — login may have failed or the form structure changed.'
    );
  }

  return {
    securitytoken,
    posthash,
    poststarttime,
    loggedinuser: get('loggedinuser'),
    subject: get('subject'),
  };
}

async function submitReply(
  jar: CookieJar,
  fields: ReplyFormFields,
  message: string
): Promise<string> {
  const body = new URLSearchParams({
    do: 'postreply',
    t: THREAD_ID,
    securitytoken: fields.securitytoken,
    posthash: fields.posthash,
    poststarttime: fields.poststarttime,
    loggedinuser: fields.loggedinuser,
    subject: fields.subject || `Re: M-Color Individual Registry`,
    message,
    wysiwyg: '0',
    parseurl: '1',
    emailupdate: '9999',
    sbutton: 'Submit Reply',
  });

  const res = await fetch(
    `${FORUM_BASE}/newreply.php?do=postreply&t=${THREAD_ID}`,
    {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': jar.header(),
        'User-Agent': 'Mozilla/5.0 (compatible; bmwic-registry-bot/1.0)',
        'Referer': `${FORUM_BASE}/newreply.php?do=newreply&noquote=1&p=${THREAD_ANCHOR_POST}`,
      },
      body: body.toString(),
    }
  );

  const location = res.headers.get('location') ?? '';

  // Standard success path: vBulletin redirects (302/303) to showthread.php.
  if ((res.status === 302 || res.status === 303) && location) {
    return resolveForumUrl(location);
  }

  // Fallback: some proxies/configs return 200 with either a "thank you" body
  // or a meta-refresh redirect instead of an HTTP redirect.
  const html = await res.text();

  if (html.includes('Thank you for posting')) {
    const metaUrl = extractMetaRefreshUrl(html);
    if (metaUrl) return resolveForumUrl(metaUrl);
    return `${FORUM_BASE}/showthread.php?t=${THREAD_ID}`;
  }

  const metaUrl = extractMetaRefreshUrl(html);
  if (metaUrl && metaUrl.includes('showthread.php')) {
    return resolveForumUrl(metaUrl);
  }

  // Not a recognized success — look for a vBulletin error message.
  const errMatch =
    html.match(/class="[^"]*\berror\b[^"]*"[^>]*>([^<]+)</i) ??
    html.match(/<div class="panel"[^>]*>([\s\S]*?)<\/div>/i) ??
    html.match(/class="[^"]*\bblockrow\b[^"]*"[^>]*>\s*([^<]+)</i);
  if (errMatch) throw new Error(`Forum error: ${errMatch[1].trim()}`);

  // Some other redirect (e.g. back to the thread) without an explicit
  // success/error marker — treat the location we do have as the result.
  if (location) return resolveForumUrl(location);

  throw new Error('Post may have failed — no redirect, no success marker, and no error message found.');
}

function resolveForumUrl(url: string): string {
  return url.startsWith('http') ? url : `${FORUM_BASE}/${url.replace(/^\//, '')}`;
}

function extractMetaRefreshUrl(html: string): string | null {
  const match = html.match(
    /<meta[^>]*http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"'>]+)["']?/i
  );
  return match ? match[1] : null;
}

// ─── Changelog handling ───────────────────────────────────────────────────────

function readPending(changelogPath: string): string {
  const content = readFileSync(changelogPath, 'utf8');
  // Match everything between ## [Unreleased] and the next --- separator or ## section
  const match = content.match(/## \[Unreleased\][^\n]*\n([\s\S]*?)(?=\n---|\n## |$)/);
  return match ? match[1].trim() : '';
}

function markPosted(changelogPath: string, postUrl: string, entries: number): void {
  const content = readFileSync(changelogPath, 'utf8');
  const date = new Date().toISOString().split('T')[0];

  // Record the last successful post BEFORE touching CHANGELOG.md, so a
  // failed/aborted rewrite still leaves a durable record that the forum
  // post itself succeeded.
  const lastPostPath = join(ROOT, '.last-post.json');
  writeFileSync(
    lastPostPath,
    JSON.stringify({ url: postUrl, postedAt: new Date().toISOString(), entries }, null, 2) + '\n',
    'utf8'
  );

  // Replace ## [Unreleased] header + its content block with:
  //   ## [Unreleased] (empty)
  //   ---
  //   ## [DATE] — URL
  //   <the old content>
  const updated = content.replace(
    /(## \[Unreleased\][^\n]*\n)([\s\S]*?)(\n---)/,
    (_, header, body, sep) =>
      `${header}\n${sep}\n\n## [${date}] — ${postUrl}\n${body.trimEnd()}\n`
  );

  if (updated === content) {
    throw new Error(
      'markPosted: CHANGELOG.md rewrite produced no change — the [Unreleased] section format may have changed. ' +
      `The post itself succeeded (${postUrl}); .last-post.json was written. Fix CHANGELOG.md manually.`
    );
  }

  writeFileSync(changelogPath, updated, 'utf8');
}

// ─── Markdown → BBCode ────────────────────────────────────────────────────────

function inlineConvert(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '[B]$1[/B]')
    .replace(/\*(.+?)\*/g, '[I]$1[/I]')
    .replace(/`(.+?)`/g, '[FONT=Courier New]$1[/FONT]')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '[URL=$2]$1[/URL]');
}

function mdToBBCode(markdown: string): string {
  const lines = markdown.split('\n');
  const out: string[] = [];
  let inList = false;
  let listType: 'numbered' | 'bullet' | null = null;

  const closeList = () => {
    if (inList) {
      out.push('[/LIST]');
      inList = false;
      listType = null;
    }
  };

  for (const raw of lines) {
    // A blank line between bullet items is just markdown paragraph spacing,
    // not a list terminator — buffer it by skipping instead of closing.
    if (raw.trim() === '' && inList) {
      continue;
    }

    const numberedMatch = raw.match(/^(\d+)\.\s+([\s\S]*)/);
    const bulletMatch = raw.match(/^[-*]\s+([\s\S]*)/);
    const headingMatch = raw.match(/^(#{1,3})\s+([\s\S]*)/);
    const isHRule = raw.trim() === '---';

    if (numberedMatch || bulletMatch) {
      const newType = numberedMatch ? 'numbered' : 'bullet';
      if (!inList || listType !== newType) {
        closeList();
        out.push(newType === 'numbered' ? '[LIST=1]' : '[LIST]');
        inList = true;
        listType = newType;
      }
      const text = inlineConvert(numberedMatch ? numberedMatch[2] : bulletMatch![1]);
      out.push(`[*]${text}`);
    } else if (headingMatch) {
      closeList();
      const level = headingMatch[1].length;
      const text = inlineConvert(headingMatch[2]);
      const size = level === 1 ? 4 : level === 2 ? 3 : 2;
      out.push(`[SIZE=${size}][B]${text}[/B][/SIZE]`);
    } else if (isHRule) {
      closeList();
      // skip horizontal rules — they add visual noise in BBCode
    } else {
      closeList();
      out.push(inlineConvert(raw));
    }
  }
  closeList();

  return out.join('\n').trim();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const changelogPath = join(ROOT, 'CHANGELOG.md');

  const pending = readPending(changelogPath);
  if (!pending) {
    console.log('Nothing pending in CHANGELOG.md — nothing to post.');
    return;
  }

  const bbcode = mdToBBCode(pending);
  const footer = [
    '',
    '[SIZE=1][COLOR=gray]—[/COLOR][/SIZE]',
    `[SIZE=1][COLOR=gray]Posted by registry automation · [URL=https://mcolors.geektechlive.com]mcolors.geektechlive.com[/URL][/COLOR][/SIZE]`,
  ].join('\n');

  const fullMessage = bbcode + footer;
  const entryCount = (pending.match(/^[-*]\s+/gm) ?? []).length;

  console.log('\n══════════════════════════════════════');
  console.log('  BBCode preview');
  console.log('══════════════════════════════════════\n');
  console.log(fullMessage);
  console.log('\n══════════════════════════════════════\n');

  if (fullMessage.length > MAX_POST_LENGTH) {
    throw new Error(
      `Post body is ${fullMessage.length} chars, exceeding the ${MAX_POST_LENGTH}-char limit. ` +
      'Trim the [Unreleased] section in CHANGELOG.md before posting.'
    );
  }

  if (dryRun) {
    console.log('[dry-run] Stopped before posting. Remove --dry-run to publish.');
    return;
  }

  const username = process.env.BIMMERPOST_USERNAME;
  const password = process.env.BIMMERPOST_PASSWORD;
  if (!username || !password) {
    console.error('Error: Set BIMMERPOST_USERNAME and BIMMERPOST_PASSWORD in .env.local');
    process.exit(1);
  }

  console.log(`Logging in as ${username}...`);
  const jar = new CookieJar();
  await login(jar);
  console.log('Logged in.');

  console.log('Fetching reply form...');
  const fields = await fetchReplyForm(jar);

  console.log('Submitting reply...');
  const postUrl = await submitReply(jar, fields, fullMessage);

  console.log(`\nPosted: ${postUrl}`);
  markPosted(changelogPath, postUrl, entryCount);
  console.log('CHANGELOG.md updated.\n');
}

main().catch((err: Error) => {
  console.error(`\nError: ${err.message}`);
  process.exit(1);
});
