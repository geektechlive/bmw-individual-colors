'use client';

import dynamic from 'next/dynamic';
import type { BmwEntry } from '../types';

const RegistryMap = dynamic(() => import('./RegistryMap'), { ssr: false });

export default function RegistryMapWrapper({ entries }: { entries: BmwEntry[] }) {
  return <RegistryMap entries={entries} />;
}
