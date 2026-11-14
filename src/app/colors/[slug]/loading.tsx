import styles from './loading.module.css';

// Shaped like a color page: hero (name, tag, sample card), tile row, two chart columns.
export default function Loading() {
  return (
    <main className={styles.page} aria-busy="true">
      <span className="sr-only" role="status">Loading</span>
      <div className={styles.hero} aria-hidden="true">
        <div className={styles.heroText}>
          <div className={`skeleton ${styles.crumbs}`} />
          <div className={`skeleton ${styles.name}`} />
          <div className={`skeleton ${styles.tag}`} />
          <div className={`skeleton ${styles.lede}`} />
        </div>
        <div className={styles.cove}>
          <div className={`skeleton ${styles.sample}`} />
        </div>
      </div>
      <div className={styles.tiles} aria-hidden="true">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={`skeleton ${styles.tile}`} />
        ))}
      </div>
      <div className={styles.charts} aria-hidden="true">
        <div className={`skeleton ${styles.chart}`} />
        <div className={`skeleton ${styles.chart}`} />
      </div>
    </main>
  );
}
