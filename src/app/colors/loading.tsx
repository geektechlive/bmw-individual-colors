import styles from './loading.module.css';

export default function ColorsLoading() {
  return (
    <main className="page" aria-busy="true">
      <span className="sr-only" role="status">Loading paints</span>
      <div className={`skeleton ${styles.heading}`} />
      <div className={styles.grid}>
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className={`skeleton ${styles.tile}`} />
        ))}
      </div>
    </main>
  );
}
