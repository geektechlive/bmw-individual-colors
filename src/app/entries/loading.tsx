import styles from './loading.module.css';

// Shaped like /entries: back link, heading row, then the table card. Dark skeleton from tokens.
export default function Loading() {
  return (
    <main className="page" aria-busy="true">
      <span className="sr-only" role="status">Loading</span>
      <div className={`skeleton ${styles.back}`} aria-hidden="true" />
      <div className={styles.head} aria-hidden="true">
        <div className={styles.headText}>
          <div className={`skeleton ${styles.title}`} />
          <div className={`skeleton ${styles.count}`} />
        </div>
        <div className={`skeleton ${styles.button}`} />
      </div>
      <div className={`card ${styles.card}`} aria-hidden="true">
        <div className={`skeleton ${styles.chips}`} />
        <div className={`skeleton ${styles.search}`} />
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className={`skeleton ${styles.row}`} />
        ))}
      </div>
    </main>
  );
}
