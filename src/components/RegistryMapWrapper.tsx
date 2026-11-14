'use client';

import dynamic from 'next/dynamic';
import MapSkeleton from './MapSkeleton';
import type { BmwEntry } from '../types';

const RegistryMap = dynamic(() => import('./RegistryMap'), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export default function RegistryMapWrapper({ entries }: { entries: BmwEntry[] }) {
  return <RegistryMap entries={entries} />;
}
