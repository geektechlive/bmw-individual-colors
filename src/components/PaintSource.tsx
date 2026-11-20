import { paintSourceLine } from '../lib/paint-source';
import styles from './PaintSource.module.css';

/**
 * Where a paint's name comes from (#93, ADR 0019). Two short lines at most: the BMW code
 * and the source, or the plain statement that BMW does not list the name, then the note
 * with its link when there is one. Links sit inside the paragraph, as running text.
 */
export default function PaintSource({ name }: { name: string }) {
  const line = paintSourceLine(name);
  return (
    <div className={styles.source} data-paint-source={line.verified ? 'bmw' : 'unverified'}>
      {line.verified ? (
        <p>
          {line.code && (
            <>
              <span className={styles.label}>BMW code</span> <span className={styles.code}>{line.code}</span>
              <span aria-hidden="true"> · </span>
            </>
          )}
          Name from{' '}
          <a href={line.sourceUrl ?? undefined} target="_blank" rel="noopener noreferrer">
            {line.sourceLabel}
          </a>
        </p>
      ) : (
        <p>{line.statement}</p>
      )}
      {line.note && (
        <p>
          {line.note}
          {line.noteUrl && (
            <>
              {' '}
              <a href={line.noteUrl} target="_blank" rel="noopener noreferrer">
                {line.noteSource ?? 'Source'}
              </a>
            </>
          )}
        </p>
      )}
    </div>
  );
}
