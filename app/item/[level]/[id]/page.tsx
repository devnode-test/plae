import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getItemDetail } from '@/lib/dashboard-metrics';
import { BreadcrumbsBar } from '@/components/dashboard/breadcrumbs-bar';
import { MetricChip } from '@/components/dashboard/metric-chip';
import { DrilldownCard } from '@/components/dashboard/drilldown-card';
import MainLayout from '@/components/layout/main-layout';
import { DashboardLevel } from '@/lib/types';

interface ItemDetailPageProps {
  params: Promise<{ level: string; id: string }>;
}

function childLevelFor(level: DashboardLevel): DashboardLevel | null {
  if (level === 'eje') return 'foco';
  if (level === 'foco') return 'objetivo';
  if (level === 'objetivo') return 'indicador';
  if (level === 'indicador') return 'meta';
  return null;
}

export default async function ItemDetailPage({ params }: ItemDetailPageProps) {
  const { level, id } = await params;

  try {
    const data = await getItemDetail(level, id);
    const nextLevel = childLevelFor(data.level);

    return (
      <MainLayout>
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <BreadcrumbsBar items={data.breadcrumbs} />

          <header className="space-y-2 rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Nivel: {data.level}</p>
            <h1 className="text-2xl font-bold">{data.nodeName}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <MetricChip kind="effort" value={data.metric.effort} />
              <MetricChip kind="compliance" value={data.metric.compliance} />
            </div>
          </header>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Desglose por hijos inmediatos</h2>
            {data.level === 'meta' ? (
              <div className="rounded-xl border border-dashed bg-card p-6 text-sm text-muted-foreground">
                Nivel final (meta).
              </div>
            ) : data.children.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-card p-6 text-sm text-muted-foreground">
                No hay elementos hijos para este nivel.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {data.children.map((item) => (
                  <DrilldownCard key={item.id} item={item} nextLevel={nextLevel} />
                ))}
              </div>
            )}
          </section>

          <div>
            <Link
              href={data.breadcrumbs.length > 1 ? `/drilldown/${data.breadcrumbs[data.breadcrumbs.length - 2].level}/${data.breadcrumbs[data.breadcrumbs.length - 2].id}` : '/dashboard'}
              className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium transition hover:bg-accent"
            >
              Volver al drilldown
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  } catch {
    notFound();
  }
}
