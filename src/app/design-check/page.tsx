import { notFound } from 'next/navigation';
import PaintSwatch, { type SwatchSize } from '../../components/PaintSwatch';
import { isDesignCheckEnabled } from '../../lib/design-check';
import { PAINTS } from './fixtures';
import styles from './page.module.css';

// Development-only fixture for the design test matrix (tests/e2e/design.spec.ts). It holds
// static, data-independent pieces so pixel baselines don't move when the registry does.

const SIZES: SwatchSize[] = ['chip', 'tile', 'panel'];

export default function DesignCheckPage() {
  if (!isDesignCheckEnabled(process.env.NODE_ENV)) notFound();

  return (
    <main className={`page ${styles.page}`}>
      <h1 className="title">Design check</h1>
      {PAINTS.map((p) => (
        <section key={p.label} className={styles.group} aria-label={p.label}>
          <h2 className="label">{p.label}</h2>
          <p className={`paint-name ${styles.name}`}>{p.name}</p>
          <div className={styles.row}>
            {SIZES.map((size) => (
              <div key={size} className={`${styles.cell} ${styles[size]}`}>
                <PaintSwatch name={p.name} hex={p.hex} finish={p.finish} size={size} />
              </div>
            ))}
          </div>
        </section>
      ))}
      <section className={styles.group} aria-label="Pills and tags">
        <h2 className="label">Pills and tags</h2>
        <div className={styles.row}>
          <span className={styles.pill}>Rare</span>
          <p className={styles.tag}>
            <span>MY 2023</span>
            <span>M3 4</span>
            <span>Automatic 4</span>
          </p>
        </div>
      </section>
    </main>
  );
}
