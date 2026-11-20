/**
 * Trims the raw BMW Individual paint data into the small snapshot committed under data/ (#93).
 *
 * The raw data is BMW's visualizer endpoint, which backs the public page
 * https://individual.bmw-m.com/en-US/colors :
 *   https://api.visualizer.aws.bmw.cloud/v1/colors/query?q=&numRows=1000&excludeTwoTone=true
 * plus, for paints BMW has dropped, one archived (Wayback Machine) visualizer page per paint.
 * Only the fields the registry uses are kept: code, BMW's raw English name, effect, hex and
 * which M3/M4 model ranges offer it. No tile URLs, no car objects.
 *
 *   npx tsx scripts/trim-bmw-snapshot.ts <allcolors.json> <archived-paints.json> <fetched YYYY-MM-DD>
 *
 * The output file name carries the fetch date; scripts/gen-paint-reference.ts reads it.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface RawCar { modelRange: string }
interface RawPaint {
  p0ID: string;
  hexCode: string;
  effect: string;
  mainColor: string;
  localizedName: Record<string, string>;
  cars: RawCar[];
}
interface RawArchived { code: string; name: string; effect: string; archived: string }

const G8X = ['G80', 'G81', 'G82', 'G83'];

const [, , currentPath, archivedPath, fetched] = process.argv;
if (!currentPath || !archivedPath || !/^\d{4}-\d{2}-\d{2}$/.test(fetched ?? '')) {
  console.error('usage: trim-bmw-snapshot.ts <allcolors.json> <archived-paints.json> <YYYY-MM-DD>');
  process.exit(1);
}

const current = JSON.parse(readFileSync(currentPath, 'utf8')) as RawPaint[];
const archivedRaw = JSON.parse(readFileSync(archivedPath, 'utf8')) as Record<string, RawArchived | null>;

const paints = current
  .map((p) => {
    // Two paints have only a German name in BMW's data: the German string is used as is.
    const en = p.localizedName.en;
    const name = en ?? p.localizedName.de;
    if (!name) throw new Error(`${p.p0ID} has no usable name`);
    const ranges = new Set(p.cars.map((c) => c.modelRange));
    return {
      code: p.p0ID,
      name,
      ...(en ? {} : { nameLanguage: 'de' }),
      effect: p.effect,
      hex: p.hexCode.toLowerCase(),
      mainColor: p.mainColor,
      g8x: G8X.filter((r) => ranges.has(r)),
    };
  })
  .sort((a, b) => a.code.localeCompare(b.code));

// Wayback's `id_` suffix serves the raw page without its rewriting; a browser shows it blank.
const archived = Object.values(archivedRaw)
  .filter((p): p is RawArchived => p !== null)
  .map((p) => ({
    code: p.code,
    name: p.name,
    effect: p.effect,
    url: p.archived.replace(/(\/web\/\d{14})id_\//, '$1/'),
  }))
  .sort((a, b) => a.code.localeCompare(b.code));
const archivedWithoutPage = Object.entries(archivedRaw)
  .filter(([, p]) => p === null)
  .map(([code]) => code)
  .sort();

const snapshot = {
  source: 'https://api.visualizer.aws.bmw.cloud/v1/colors/query?q=&numRows=1000&excludeTwoTone=true',
  citedPage: 'https://individual.bmw-m.com/en-US/colors',
  fetched,
  note: 'paints = BMW Individual paint list; archived = paints BMW has dropped, one archived visualizer page each; archivedWithoutPage = codes with no archived page found.',
  paints,
  archived,
  archivedWithoutPage,
};

const out = join(process.cwd(), 'data', `bmw-individual-paints-${fetched}.json`);
writeFileSync(out, `${JSON.stringify(snapshot, null, 1)}\n`);
console.log(`${paints.length} paints, ${archived.length} archived, ${archivedWithoutPage.length} without page -> ${out}`);
