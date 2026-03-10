import { getDashboardOverview } from '@/lib/dashboard-metrics';
import MainLayout from '@/components/layout/main-layout';
import { HierarchyTable } from '@/components/dashboard/hierarchy-table';
import { ExportReportButton } from '@/components/dashboard/export-report-button';

export const metadata = {
  title: 'Dashboard — Esfuerzo y Cumplimiento',
  description: 'Visualiza métricas agregadas de esfuerzo y cumplimiento con drilldown por jerarquía.',
};

export default async function PublicDashboardPage() {
  const { globalMetric, axes } = await getDashboardOverview();

  return (
    <MainLayout>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold md:text-3xl">Visión global</h1>
          <ExportReportButton globalMetric={globalMetric} axes={axes} />
        </header>
        <p className="text-sm text-muted-foreground md:text-base">Esfuerzo y cumplimiento agregados</p>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Esfuerzo total</p>
            <p className="mt-1 text-xs text-muted-foreground">Porcentaje de acciones completadas sobre el total de acciones registradas.</p>
            <p className="mt-2 text-3xl font-semibold">{globalMetric.effort.toFixed(1)}%</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Acciones completadas: {globalMetric.completedActions} de {globalMetric.totalActions}
            </p>
          </article>

          <article className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Cumplimiento total</p>
            <p className="mt-1 text-xs text-muted-foreground">Promedio de avance real frente a la meta definida para cada meta anual visible.</p>
            <p className="mt-2 text-3xl font-semibold">{globalMetric.compliance.toFixed(1)}%</p>
            <p className="mt-2 text-xs text-muted-foreground">Metas consideradas: {globalMetric.metasCount}</p>
          </article>
        </section>

        <section className="space-y-3">
          {axes.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card p-6 text-sm text-muted-foreground">
              No hay ejes disponibles para mostrar.
            </div>
          ) : (
            <HierarchyTable roots={axes} />
          )}
        </section>
      </div>
    </MainLayout>
  );
}
