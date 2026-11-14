import styles from './loading.module.css';

// Shaped like /reports: back link, heading, intro, filter bar, jump nav, then the chart grid.
export default function Loading() {
  return (
    <main className="page" aria-busy="true">
      <span className="sr-only" role="status">Loading</span>
      <div className={`skeleton ${styles.back}`} aria-hidden="true" />
      <div className={`skeleton ${styles.title}`} aria-hidden="true" />
      <div className={`skeleton ${styles.intro}`} aria-hidden="true" />
      <div className={`skeleton ${styles.filters}`} aria-hidden="true" />
      <div className={`skeleton ${styles.jump}`} aria-hidden="true" />
      <div className={styles.grid} aria-hidden="true">
        <div className={`skeleton ${styles.card} ${styles.full}`} />
        <div className={`skeleton ${styles.card}`} />
        <div className={`skeleton ${styles.card}`} />
        <div className={`skeleton ${styles.card}`} />
      </div>
    </main>
  );
}
