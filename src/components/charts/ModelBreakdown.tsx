'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { BmwEntry } from '../../types';

interface Props {
  entries: BmwEntry[];
}

export default function ModelBreakdown({ entries }: Props) {
  // M3 vs M4
  const modelMap = new Map<string, number>();
  for (const e of entries) {
    const key = e.body_style;
    modelMap.set(key, (modelMap.get(key) ?? 0) + 1);
  }
  const modelData = Array.from(modelMap.entries()).map(([name, value]) => ({ name, value }));

  // Drivetrain
  const dtMap = new Map<string, number>();
  for (const e of entries) {
    dtMap.set(e.drivetrain, (dtMap.get(e.drivetrain) ?? 0) + 1);
  }
  const dtData = Array.from(dtMap.entries()).map(([name, value]) => ({ name, value }));

  // Transmission
  const tmMap = new Map<string, number>();
  for (const e of entries) {
    tmMap.set(e.transmission, (tmMap.get(e.transmission) ?? 0) + 1);
  }
  const tmData = Array.from(tmMap.entries()).map(([name, value]) => ({ name, value }));

  const MODEL_COLORS = ['#1C69D4', '#e85d04'];
  const DT_COLORS = ['#1C69D4', '#3dd68c', '#f4a261'];
  const TM_COLORS = ['#7c3aed', '#06b6d4'];

  const tooltipStyle = { background: '#1e2a3a', border: '1px solid #2d3f55', color: '#e2e8f0' };
  const legendFormatter = (value: string) => (
    <span style={{ color: '#cbd5e1', fontSize: 12 }}>{value}</span>
  );

  if (entries.length === 0) {
    return <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No data yet.</p>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
      <div>
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>
          Body Style
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={modelData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={2} label={false}>
              {modelData.map((_, i) => (
                <Cell key={i} fill={MODEL_COLORS[i % MODEL_COLORS.length]} stroke="#0f172a" />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [Number(v), 'Count']} />
            <Legend formatter={legendFormatter} iconType="circle" iconSize={8} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>
          Drivetrain
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={dtData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={2} label={false}>
              {dtData.map((_, i) => (
                <Cell key={i} fill={DT_COLORS[i % DT_COLORS.length]} stroke="#0f172a" />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [Number(v), 'Count']} />
            <Legend formatter={legendFormatter} iconType="circle" iconSize={8} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>
          Transmission
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={tmData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={2} label={false}>
              {tmData.map((_, i) => (
                <Cell key={i} fill={TM_COLORS[i % TM_COLORS.length]} stroke="#0f172a" />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [Number(v), 'Count']} />
            <Legend formatter={legendFormatter} iconType="circle" iconSize={8} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
