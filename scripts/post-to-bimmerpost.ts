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
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

config({ path: join(ROOT, '.env.local') });

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

  if (!jar.header().includes('bbuserid') && !jar.header().includes('bbsessionhash')) {
    throw new Error(
      'Login failed — no auth cookies received. Check BIMMERPOST_USERNAME/PASSWORD.'
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

  const get = (name: string) =>
    html.match(new RegExp(`name="${name}"[^>]*value="([^"]*)"`))?.[1] ?? '';

  const securitytoken = get('securitytoken');
  if (!securitytoken || securitytoken === 'guest') {
    throw new Error(
      'Could not get securitytoken from reply form — login may have failed.'
    );
  }

  return {
    securitytoken,
    posthash: get('posthash'),
    poststarttime: get('poststarttime'),
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
  if (!location) {
    // vBulletin sometimes returns 200 with the form on error
    const html = await res.text();
    const errMatch = html.match(/class="[^"]*error[^"]*"[^>]*>([^<]+)</i);
    if (errMatch) throw new Error(`Forum error: ${errMatch[1].trim()}`);
    throw new Error('Post may have failed — no redirect received and no error message found.');
  }

  return location.startsWith('http')
    ? location
    : `${FORUM_BASE}/${location.replace(/^\//, '')}`;
}

// ─── Changelog handling ───────────────────────────────────────────────────────

function readPending(changelogPath: string): string {
  const content = readFileSync(changelogPath, 'utf8');
  // Match everything between ## [Unreleased] and the next --- separator or ## section
  const match = content.match(/## \[Unreleased\][^\n]*\n([\s\S]*?)(?=\n---|\n## |$)/);
  return match ? match[1].trim() : '';
}

function markPosted(changelogPath: string, postUrl: string): void {
  const content = readFileSync(changelogPath, 'utf8');
  const date = new Date().toISOString().split('T')[0];

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
      out.push(listType === 'numbered' ? '[/LIST]' : '[/LIST]');
      inList = false;
      listType = null;
    }
  };

  for (const raw of lines) {
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

  console.log('\n══════════════════════════════════════');
  console.log('  BBCode preview');
  console.log('══════════════════════════════════════\n');
  console.log(fullMessage);
  console.log('\n══════════════════════════════════════\n');

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
  markPosted(changelogPath, postUrl);
  console.log('CHANGELOG.md updated.\n');
}

main().catch((err: Error) => {
  console.error(`\nError: ${err.message}`);
  process.exit(1);
});
