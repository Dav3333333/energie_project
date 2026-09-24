import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { formatDateTime } from '@/lib/formatters';

/**
 * Affiche l'évolution de l'index kWh dans le temps.
 */
export default function ConsumptionChart({ readings = [], height = 220 }) {
  const data = (readings ?? [])
    .filter((r) => r.status === 'VALID' && r.totalKwh != null && r.readingDate)
    .map((r) => ({
      date: toDate(r.readingDate)?.getTime() ?? 0,
      kwh: Number(r.totalKwh),
      label: formatDateTime(r.readingDate, 'dd/MM'),
    }))
    .sort((a, b) => a.date - b.date);

  if (data.length < 2) {
    return (
      <div className="text-center text-sm text-[var(--c-text-muted)] py-10">
        Pas assez de relevés pour afficher un graphique.
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" fontSize={11} stroke="#94a3b8" />
          <YAxis fontSize={11} stroke="#94a3b8" />
          <Tooltip
            formatter={(v) => [`${v} kWh`, 'Index']}
            labelFormatter={(l) => `Le ${l}`}
          />
          <Line
            type="monotone"
            dataKey="kwh"
            stroke="#0ea5e9"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function toDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v?.toDate === 'function') return v.toDate();
  return new Date(v);
}