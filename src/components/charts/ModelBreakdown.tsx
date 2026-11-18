import type { BmwEntry } from '../../types';
import { cssVars } from '../../lib/css-vars';
import shared from './charts.module.css';
import styles from './ModelBreakdown.module.css';

interface Props {
  entries: BmwEntry[];
}

interface Split {
  title: string;
  parts: { label: string; count: number; mark: string }[];
}

function buildSplits(entries: BmwEntry[]): Split[] {
  const count = (pick: (e: BmwEntry) => string, value: string) => entries.filter((e) => pick(e) === value).length;
  return [
    {
      title: 'Model',
      parts: [
        { label: 'M3', count: count((e) => e.body_style, 'M3'), mark: 'var(--accent)' },
        { label: 'M4', count: count((e) => e.body_style, 'M4'), mark: 'var(--m-red)' },
      ],
    },
    {
      title: 'Drivetrain',
      parts: [
        { label: 'RWD', count: count((e) => e.drivetrain, 'RWD'), mark: 'var(--accent)' },
        { label: 'AWD', count: count((e) => e.drivetrain, 'AWD'), mark: 'var(--ok)' },
      ],
    },
  ];
}

/** Two plain split bars with the numbers written out, in place of the old three pies. */
export default function ModelBreakdown({ entries }: Props) {
  if (entries.length === 0) {
    return <p className={shared.empty}>No data yet.</p>;
  }

  return (
    <div className={styles.splits}>
      {buildSplits(entries).map((split) => {
        const total = split.parts.reduce((sum, p) => sum + p.count, 0);
        return (
          <div key={split.title} className={styles.split}>
            <p className={styles.title}>{split.title}</p>
            <div className={styles.bar} aria-hidden="true">
              {split.parts.map((p) => (
                <span
                  key={p.label}
                  className={styles.part}
                  style={cssVars({ '--w': total > 0 ? p.count / total : 0, '--mark': p.mark })}
                />
              ))}
            </div>
            <ul className={styles.legend}>
              {split.parts.map((p) => (
                <li key={p.label} className={styles.item}>
                  <span className={styles.dot} style={cssVars({ '--mark': p.mark })} aria-hidden="true" />
                  <span className={styles.label}>{p.label}</span>
                  <span className="num">{p.count}</span>
                  <span className={styles.pct}>({total > 0 ? Math.round((p.count / total) * 100) : 0}%)</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
