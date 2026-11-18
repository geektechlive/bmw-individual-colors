'use client';

import { useState } from 'react';
import Link from 'next/link';
import IntentLink from './IntentLink';
import FlagDialog from './FlagDialog';
import PaintSwatch from './PaintSwatch';
import { getColorHex, colorToSlug } from '../lib/colors';
import { carLabel, cityState, entryDate, forumTagLabel, interiorDetail, phoneSubline } from '../lib/entry-display';
import styles from './EntryPhoneRow.module.css';
import type { BmwEntry } from '../types';

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="label">{label}</dt>
      <dd>{children || '–'}</dd>
    </>
  );
}

/**
 * One build as a two-line row, for phones (#69). Line 1: swatch, paint, year and model, and
 * a chevron; line 2: drive, trans, wheels and place. The chevron opens the rest, with the
 * edit and report actions. The panel is always in the DOM so aria-controls has a target.
 */
export default function EntryPhoneRow({
  entry: e,
  reported = false,
  onReported,
  expandable = true,
}: {
  entry: BmwEntry;
  reported?: boolean;
  onReported?: () => void;
  /** false: just the two lines, no chevron and no panel (the home "Latest builds" list, #85). */
  expandable?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [reporting, setReporting] = useState(false);
  const panelId = `entry-${e.id}-more`;
  const detail = interiorDetail(e);
  const place = [cityState(e), e.location_country].filter(Boolean).join(' · ');
  const tag = forumTagLabel(e.source_forum);

  return (
    <li className={styles.row}>
      <div className={expandable ? styles.top : `${styles.top} ${styles.flat}`}>
        <PaintSwatch name={e.ext_color} hex={getColorHex(e.ext_color)} />
        <IntentLink href={`/colors/${colorToSlug(e.ext_color)}`} className={`paint-name ${styles.paint}`}>
          <span>{e.ext_color}</span>
        </IntentLink>
        <span className={styles.car}>{carLabel(e)}</span>
        {expandable && (
          <button
            type="button"
            className={styles.toggle}
            aria-expanded={expanded}
            aria-controls={panelId}
            aria-label="More about this build"
            onClick={() => setExpanded((v) => !v)}
          />
        )}
      </div>
      <div className={expandable ? styles.sub : `${styles.sub} ${styles.flat}`}>{phoneSubline(e)}</div>
      {expandable && (
      <div id={panelId} className={styles.more} hidden={!expanded}>
        <dl className={styles.facts}>
          <Fact label="Interior">
            {e.interior_color ? (
              <>
                {e.interior_color}
                {detail ? <span className={styles.detail}> ({detail})</span> : null}
              </>
            ) : null}
          </Fact>
          <Fact label="Location">{place}</Fact>
          <Fact label="Forum user">
            {tag || e.forum_username ? (
              <>
                {tag ? <span className={styles.tag}>{tag}</span> : null}
                {e.forum_username}
              </>
            ) : null}
          </Fact>
          <Fact label="Posted">{entryDate(e)}</Fact>
        </dl>
        <div className={styles.actions}>
          {/* No prefetch: /edit bypasses the edge cache (see RowActions). */}
          <Link href={`/edit/${e.id}`} prefetch={false} className={styles.action}>
            Edit this build
          </Link>
          <button
            type="button"
            className={styles.action}
            aria-disabled={reported}
            onClick={() => {
              if (!reported) setReporting(true);
            }}
          >
            {reported ? 'Reported, thanks' : 'Report a problem'}
          </button>
        </div>
      </div>
      )}
      {reporting && (
        <FlagDialog
          id={e.id}
          onClose={(sent) => {
            setReporting(false);
            if (sent) onReported?.();
          }}
        />
      )}
    </li>
  );
}
