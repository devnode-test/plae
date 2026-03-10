import { notFound } from 'next/navigation';
import { getDrilldown } from '@/lib/dashboard-metrics';
import { BreadcrumbsBar } from '@/components/dashboard/breadcrumbs-bar';
import { MetricChip } from '@/components/dashboard/metric-chip';
import { DrilldownCard } from '@/components/dashboard/drilldown-card';
import MainLayout from '@/components/layout/main-layout';

interface DrilldownPageProps {
  params: Promise<{ level: string; id: string }>;
}

export default async function DrilldownPage({ params }: DrilldownPageProps) {
  const { level, id } = await params;

  try {
    const data = await getDrilldown(level, id);

    return (
      <MainLayout>
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <BreadcrumbsBar items={data.breadcrumbs} />

          <header className="space-y-3 rounded-xl border bg-card p-5">
            <p className="text-sm uppercase text-muted-foreground">Nivel actual: {data.level}</p>
            <h1 className="text-2xl font-bold">{data.nodeName}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <MetricChip kind="effort" value={data.metric.effort} />
              <MetricChip kind="compliance" value={data.metric.compliance} />
            </div>
          </header>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Desglose</h2>
            {data.children.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-card p-6 text-sm text-muted-foreground">
                No hay elementos en este nivel.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {data.children.map((item) => (
                  <DrilldownCard key={item.id} item={item} nextLevel={data.childLevel} />
                ))}
              </div>
            )}
          </section>
        </div>
      </MainLayout>
    );
  } catch {
    notFound();
  }
}
