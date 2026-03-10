'use client';

interface MetricChipProps {
  kind: 'effort' | 'compliance';
  value: number;
}

export function MetricChip({ kind, value }: MetricChipProps) {
  const isEffort = kind === 'effort';
  const toneClass = isEffort
    ? 'border-blue-200 bg-blue-50 text-blue-700'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700';
  const label = isEffort ? 'Esfuerzo' : 'Cumplimiento';

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${toneClass}`}>
      {label}: {value.toFixed(1)}%
    </span>
  );
}
