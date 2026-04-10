'use client';

import dynamic from 'next/dynamic';
import type { ColorCount } from '../../types';

const ColorTreemap = dynamic(() => import('./ColorTreemap'), { ssr: false });

export default function ColorTreemapLoader({ data }: { data: ColorCount[] }) {
  return <ColorTreemap data={data} />;
}
