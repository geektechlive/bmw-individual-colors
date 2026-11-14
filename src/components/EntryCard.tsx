import Link from 'next/link';
import { getColorHex, colorToSlug } from '../lib/colors';
import { cityState, entryDate, interiorDetail, modelLabel } from '../lib/entry-display';
import FlagButton from './FlagButton';
import PaintSwatch from './PaintSwatch';
import styles from './EntryCard.module.css';
import type { BmwEntry } from '../types';

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.fact}>
      <dt className="label">{label}</dt>
      <dd className={styles.value}>{children || '–'}</dd>
    </div>
  );
}

/** One build as a card, for phones (#42). Same data as a table row. */
export default function EntryCard({ entry: e }: { entry: BmwEntry }) {
  const detail = interiorDetail(e);
  const place = [cityState(e), e.location_country].filter(Boolean).join(' · ');

  return (
    <li className={`card ${styles.card}`}>
      <div className={styles.head}>
        <PaintSwatch name={e.ext_color} hex={getColorHex(e.ext_color)} />
        <Link href={`/colors/${colorToSlug(e.ext_color)}`} className={`paint-name ${styles.paint}`}>
          {e.ext_color}
        </Link>
        <div className={styles.actions}>
          <FlagButton id={e.id} />
          {/* No prefetch: /edit bypasses the edge cache (see EntryTable). */}
          <Link
            href={`/edit/${e.id}`}
            prefetch={false}
            className={styles.edit}
            aria-label={`Edit ${e.ext_color} ${e.model_year} build`}
          >
            Edit
          </Link>
        </div>
      </div>
      <dl className={styles.facts}>
        <Fact label="Year"><span className="mono">{e.model_year}</span></Fact>
        <Fact label="Model">{modelLabel(e)}</Fact>
        <Fact label="Drive">{e.drivetrain}</Fact>
        <Fact label="Trans">{e.transmission}</Fact>
        {/* One expression per Fact, so an empty value falls back to "–". */}
        <Fact label="Interior">
          {e.interior_color ? (
            <>
              {e.interior_color}
              {detail ? <span className={styles.detail}> ({detail})</span> : null}
            </>
          ) : null}
        </Fact>
        <Fact label="Wheels">{e.wheels}</Fact>
        <Fact label="Location">{place}</Fact>
        <Fact label="Forum user">
          {e.source_forum || e.forum_username ? (
            <>
              {e.source_forum ? <span className={styles.forum}>{e.source_forum}</span> : null}
              {e.forum_username ? <span className={styles.user}>{e.forum_username}</span> : null}
            </>
          ) : null}
        </Fact>
        <Fact label="Added">{entryDate(e)}</Fact>
      </dl>
    </li>
  );
}
