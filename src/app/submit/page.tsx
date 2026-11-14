import Link from 'next/link';
import EntryForm from '../../components/EntryForm';
import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Submit Your Build — BMW Individual Colors Registry',
};

export default function SubmitPage() {
  return (
    <main className="page page--form">
      <div className={styles.back}>
        <Link href="/" className="link">
          ← Back to Home
        </Link>
      </div>

      <h1 className={`title ${styles.heading}`}>Submit Your Build</h1>
      <p className={`muted ${styles.lede}`}>
        Add your BMW M Individual color build to the community registry.
        Your submission helps track color popularity and distribution.
      </p>

      <div className={`card ${styles.card}`}>
        <EntryForm />
      </div>
    </main>
  );
}
