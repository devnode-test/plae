import Link from 'next/link';
import { DashboardItem, DashboardLevel } from '@/lib/types';
import { MetricChip } from '@/components/dashboard/metric-chip';

interface DrilldownCardProps {
  item: DashboardItem;
  nextLevel: DashboardLevel | null;
}

export function DrilldownCard({ item, nextLevel }: DrilldownCardProps) {
  return (
    <article className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="space-y-3">
        <h3 className="text-base font-semibold">{item.nombre}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <MetricChip kind="effort" value={item.effort} />
          <MetricChip kind="compliance" value={item.compliance} />
        </div>
        <div className="flex flex-wrap gap-3">
          {item.hasChildren && nextLevel ? (
            <Link
              href={`/drilldown/${nextLevel}/${item.id}`}
              className="inline-flex items-center rounded-md bg-blue-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-400"
            >
              Ver desglose
            </Link>
          ) : null}
          <Link
            href={`/item/${item.level}/${item.id}`}
            className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium transition hover:bg-accent"
          >
            Ver detalle
          </Link>
        </div>
      </div>
    </article>
  );
}
