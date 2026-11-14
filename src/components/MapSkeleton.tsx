import styles from './MapSkeleton.module.css';

/** Placeholder the size of the map, shown while Leaflet loads (dynamic import and route). */
export default function MapSkeleton() {
  return (
    <div className={`skeleton ${styles.box}`} role="status" aria-live="polite">
      <span className="sr-only">Loading map</span>
    </div>
  );
}
