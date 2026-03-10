import { createClient } from '@/lib/supabase-server';
import { BreadcrumbItem, DashboardActionItem, DashboardItem, DashboardLevel, DashboardMetric, DashboardTreeNode } from '@/lib/types';

type EjeRow = { id: string; nombre: string; orden: number | null };
type FocoRow = { id: string; nombre: string; eje_id: string; orden: number | null };
type ObjetivoRow = { id: string; nombre: string; foco_id: string; orden: number | null };
type IndicadorRow = { id: string; nombre: string; objetivo_id: string };
type MetaRow = { id: string; indicador_id: string; anio: number; valor_meta: number | null; valor_real: number | null };
type AccionRow = { id: string; meta_anual_id: string; estado: string; descripcion: string };
type EvidenciaRow = { id: string; accion_id: string; nombre_archivo: string; url_archivo: string };

interface HierarchyData {
  ejes: EjeRow[];
  focos: FocoRow[];
  objetivos: ObjetivoRow[];
  indicadores: IndicadorRow[];
  metas: MetaRow[];
  acciones: AccionRow[];
  evidencias: EvidenciaRow[];
}

interface HierarchyMaps {
  ejeById: Map<string, EjeRow>;
  focoById: Map<string, FocoRow>;
  objetivoById: Map<string, ObjetivoRow>;
  indicadorById: Map<string, IndicadorRow>;
  metaById: Map<string, MetaRow>;
  focosByEje: Map<string, FocoRow[]>;
  objetivosByFoco: Map<string, ObjetivoRow[]>;
  indicadoresByObjetivo: Map<string, IndicadorRow[]>;
  metasByIndicador: Map<string, MetaRow[]>;
  actionsByMeta: Map<string, AccionRow[]>;
  evidenciasByAccion: Map<string, EvidenciaRow[]>;
  metaIdsByLevel: {
    meta: Map<string, string[]>;
    indicador: Map<string, string[]>;
    objetivo: Map<string, string[]>;
    foco: Map<string, string[]>;
    eje: Map<string, string[]>;
  };
}

const emptyMetric: DashboardMetric = {
  effort: 0,
  compliance: 0,
  metasCount: 0,
  completedActions: 0,
  totalActions: 0,
};

function toMap<T extends { id: string }>(rows: T[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

function groupBy<T, K extends string>(rows: T[], keyFn: (row: T) => K) {
  const map = new Map<K, T[]>();
  for (const row of rows) {
    const key = keyFn(row);
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }
  return map;
}

function roundMetric(value: number) {
  return Number(value.toFixed(1));
}

function isVisibleMeta(meta: MetaRow, currentYear: number) {
  return meta.anio === currentYear || meta.anio === currentYear - 1;
}

function getVisibleMetaIds(metaIds: string[], maps: HierarchyMaps, currentYear: number) {
  return metaIds.filter((metaId) => {
    const meta = maps.metaById.get(metaId);
    return meta ? isVisibleMeta(meta, currentYear) : false;
  });
}

function averageMetricByMeta(metaIds: string[], maps: HierarchyMaps): DashboardMetric {
  if (metaIds.length === 0) {
    return emptyMetric;
  }

  let effortSum = 0;
  let complianceSum = 0;
  let completedActions = 0;
  let totalActions = 0;

  for (const metaId of metaIds) {
    const meta = maps.metaById.get(metaId);
    if (!meta) {
      continue;
    }

    const acciones = maps.actionsByMeta.get(metaId) ?? [];
    const total = acciones.length;
    const completed = acciones.filter((accion) => accion.estado === 'completada').length;
    const effort = total > 0 ? (completed / total) * 100 : 0;
    const target = Number(meta.valor_meta ?? 0);
    const real = Number(meta.valor_real ?? 0);
    const compliance = target > 0 ? Math.min((real / target) * 100, 100) : 0;

    effortSum += effort;
    complianceSum += compliance;
    completedActions += completed;
    totalActions += total;
  }

  return {
    effort: roundMetric(effortSum / metaIds.length),
    compliance: roundMetric(complianceSum / metaIds.length),
    metasCount: metaIds.length,
    completedActions,
    totalActions,
  };
}

function sortByOrderAndName<T extends { nombre: string; orden?: number | null }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const orderA = a.orden ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.orden ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.nombre.localeCompare(b.nombre, 'es');
  });
}

function buildMetaIdsByLevel(data: HierarchyData, maps: Omit<HierarchyMaps, 'metaIdsByLevel'>) {
  const metaByMeta = new Map<string, string[]>();
  const metaByIndicador = new Map<string, string[]>();
  const metaByObjetivo = new Map<string, string[]>();
  const metaByFoco = new Map<string, string[]>();
  const metaByEje = new Map<string, string[]>();

  for (const meta of data.metas) {
    metaByMeta.set(meta.id, [meta.id]);
  }

  for (const indicador of data.indicadores) {
    const metas = maps.metasByIndicador.get(indicador.id) ?? [];
    metaByIndicador.set(indicador.id, metas.map((meta) => meta.id));
  }

  for (const objetivo of data.objetivos) {
    const indicadores = maps.indicadoresByObjetivo.get(objetivo.id) ?? [];
    const metaIds = indicadores.flatMap((indicador) => metaByIndicador.get(indicador.id) ?? []);
    metaByObjetivo.set(objetivo.id, metaIds);
  }

  for (const foco of data.focos) {
    const objetivos = maps.objetivosByFoco.get(foco.id) ?? [];
    const metaIds = objetivos.flatMap((objetivo) => metaByObjetivo.get(objetivo.id) ?? []);
    metaByFoco.set(foco.id, metaIds);
  }

  for (const eje of data.ejes) {
    const focos = maps.focosByEje.get(eje.id) ?? [];
    const metaIds = focos.flatMap((foco) => metaByFoco.get(foco.id) ?? []);
    metaByEje.set(eje.id, metaIds);
  }

  return {
    meta: metaByMeta,
    indicador: metaByIndicador,
    objetivo: metaByObjetivo,
    foco: metaByFoco,
    eje: metaByEje,
  };
}

async function fetchHierarchyData(): Promise<HierarchyData> {
  const supabase = await createClient();

  const [ejesRes, focosRes, objetivosRes, indicadoresRes, metasRes, accionesRes, evidenciasRes] = await Promise.all([
    supabase.from('ejes').select('id,nombre,orden').order('orden', { ascending: true }),
    supabase.from('focos').select('id,nombre,eje_id,orden').order('orden', { ascending: true }),
    supabase.from('objetivos').select('id,nombre,foco_id,orden').order('orden', { ascending: true }),
    supabase.from('indicadores').select('id,nombre,objetivo_id').order('nombre', { ascending: true }),
    supabase.from('metas_anuales').select('*'),
    supabase.from('acciones').select('id,meta_anual_id,estado,descripcion'),
    supabase.from('evidencias').select('id,accion_id,nombre_archivo,url_archivo'),
  ]);

  if (ejesRes.error || focosRes.error || objetivosRes.error || indicadoresRes.error || metasRes.error || accionesRes.error || evidenciasRes.error) {
    throw new Error('No se pudieron cargar los datos del dashboard');
  }

  const metas = ((metasRes.data ?? []) as Array<Record<string, unknown>>).map((meta) => ({
    id: String(meta.id),
    indicador_id: String(meta.indicador_id),
    anio: Number(meta['año'] ?? 0),
    valor_meta: typeof meta.valor_meta === 'number' ? meta.valor_meta : Number(meta.valor_meta ?? 0),
    valor_real: typeof meta.valor_real === 'number' ? meta.valor_real : Number(meta.valor_real ?? 0),
  }));

  return {
    ejes: ejesRes.data ?? [],
    focos: focosRes.data ?? [],
    objetivos: objetivosRes.data ?? [],
    indicadores: indicadoresRes.data ?? [],
    metas,
    acciones: accionesRes.data ?? [],
    evidencias: evidenciasRes.data ?? [],
  };
}

function buildHierarchyMaps(data: HierarchyData): HierarchyMaps {
  const focoRows = sortByOrderAndName(data.focos);
  const objetivoRows = sortByOrderAndName(data.objetivos);
  const ejeRows = sortByOrderAndName(data.ejes);

  const baseMaps = {
    ejeById: toMap(ejeRows),
    focoById: toMap(focoRows),
    objetivoById: toMap(objetivoRows),
    indicadorById: toMap(data.indicadores),
    metaById: toMap(data.metas),
    focosByEje: groupBy(focoRows, (item) => item.eje_id),
    objetivosByFoco: groupBy(objetivoRows, (item) => item.foco_id),
    indicadoresByObjetivo: groupBy(data.indicadores, (item) => item.objetivo_id),
    metasByIndicador: groupBy(data.metas, (item) => item.indicador_id),
    actionsByMeta: groupBy(data.acciones, (item) => item.meta_anual_id),
    evidenciasByAccion: groupBy(data.evidencias, (item) => item.accion_id),
  };

  return {
    ...baseMaps,
    metaIdsByLevel: buildMetaIdsByLevel(data, baseMaps),
  };
}

function getMetaLabel(meta: MetaRow) {
  return `Meta anual ${meta.anio}`;
}

function getBreadcrumbs(level: DashboardLevel, id: string, maps: HierarchyMaps): BreadcrumbItem[] {
  if (level === 'eje') {
    const eje = maps.ejeById.get(id);
    return eje ? [{ id: eje.id, level: 'eje', nombre: eje.nombre }] : [];
  }

  if (level === 'foco') {
    const foco = maps.focoById.get(id);
    if (!foco) return [];
    const eje = maps.ejeById.get(foco.eje_id);
    return [
      ...(eje ? [{ id: eje.id, level: 'eje' as const, nombre: eje.nombre }] : []),
      { id: foco.id, level: 'foco', nombre: foco.nombre },
    ];
  }

  if (level === 'objetivo') {
    const objetivo = maps.objetivoById.get(id);
    if (!objetivo) return [];
    const foco = maps.focoById.get(objetivo.foco_id);
    const eje = foco ? maps.ejeById.get(foco.eje_id) : undefined;
    return [
      ...(eje ? [{ id: eje.id, level: 'eje' as const, nombre: eje.nombre }] : []),
      ...(foco ? [{ id: foco.id, level: 'foco' as const, nombre: foco.nombre }] : []),
      { id: objetivo.id, level: 'objetivo', nombre: objetivo.nombre },
    ];
  }

  if (level === 'indicador') {
    const indicador = maps.indicadorById.get(id);
    if (!indicador) return [];
    const objetivo = maps.objetivoById.get(indicador.objetivo_id);
    const foco = objetivo ? maps.focoById.get(objetivo.foco_id) : undefined;
    const eje = foco ? maps.ejeById.get(foco.eje_id) : undefined;
    return [
      ...(eje ? [{ id: eje.id, level: 'eje' as const, nombre: eje.nombre }] : []),
      ...(foco ? [{ id: foco.id, level: 'foco' as const, nombre: foco.nombre }] : []),
      ...(objetivo ? [{ id: objetivo.id, level: 'objetivo' as const, nombre: objetivo.nombre }] : []),
      { id: indicador.id, level: 'indicador', nombre: indicador.nombre },
    ];
  }

  const meta = maps.metaById.get(id);
  if (!meta) return [];
  const indicador = maps.indicadorById.get(meta.indicador_id);
  const objetivo = indicador ? maps.objetivoById.get(indicador.objetivo_id) : undefined;
  const foco = objetivo ? maps.focoById.get(objetivo.foco_id) : undefined;
  const eje = foco ? maps.ejeById.get(foco.eje_id) : undefined;
  return [
    ...(eje ? [{ id: eje.id, level: 'eje' as const, nombre: eje.nombre }] : []),
    ...(foco ? [{ id: foco.id, level: 'foco' as const, nombre: foco.nombre }] : []),
    ...(objetivo ? [{ id: objetivo.id, level: 'objetivo' as const, nombre: objetivo.nombre }] : []),
    ...(indicador ? [{ id: indicador.id, level: 'indicador' as const, nombre: indicador.nombre }] : []),
    { id: meta.id, level: 'meta', nombre: getMetaLabel(meta) },
  ];
}

function getChildLevel(level: DashboardLevel): DashboardLevel | null {
  if (level === 'eje') return 'foco';
  if (level === 'foco') return 'objetivo';
  if (level === 'objetivo') return 'indicador';
  if (level === 'indicador') return 'meta';
  return null;
}

function normalizeLevel(level: string): DashboardLevel {
  if (level === 'eje' || level === 'foco' || level === 'objetivo' || level === 'indicador' || level === 'meta') {
    return level;
  }
  throw new Error('Nivel inválido');
}

function getMetricFor(level: DashboardLevel, id: string, maps: HierarchyMaps, currentYear: number) {
  const metaIds = maps.metaIdsByLevel[level].get(id) ?? [];
  return averageMetricByMeta(getVisibleMetaIds(metaIds, maps, currentYear), maps);
}

function getNodeName(level: DashboardLevel, id: string, maps: HierarchyMaps) {
  if (level === 'eje') return maps.ejeById.get(id)?.nombre ?? 'Eje';
  if (level === 'foco') return maps.focoById.get(id)?.nombre ?? 'Foco';
  if (level === 'objetivo') return maps.objetivoById.get(id)?.nombre ?? 'Objetivo';
  if (level === 'indicador') return maps.indicadorById.get(id)?.nombre ?? 'Indicador';
  const meta = maps.metaById.get(id);
  return meta ? getMetaLabel(meta) : 'Meta';
}

function getChildren(level: DashboardLevel, id: string, maps: HierarchyMaps, currentYear: number): DashboardItem[] {
  if (level === 'eje') {
    return (maps.focosByEje.get(id) ?? []).map((foco) => {
      const metric = getMetricFor('foco', foco.id, maps, currentYear);
      return {
        id: foco.id,
        nombre: foco.nombre,
        level: 'foco',
        effort: metric.effort,
        compliance: metric.compliance,
        hasChildren: (maps.objetivosByFoco.get(foco.id) ?? []).length > 0,
      };
    });
  }

  if (level === 'foco') {
    return (maps.objetivosByFoco.get(id) ?? []).map((objetivo) => {
      const metric = getMetricFor('objetivo', objetivo.id, maps, currentYear);
      return {
        id: objetivo.id,
        nombre: objetivo.nombre,
        level: 'objetivo',
        effort: metric.effort,
        compliance: metric.compliance,
        hasChildren: (maps.indicadoresByObjetivo.get(objetivo.id) ?? []).length > 0,
      };
    });
  }

  if (level === 'objetivo') {
    return (maps.indicadoresByObjetivo.get(id) ?? []).map((indicador) => {
      const metric = getMetricFor('indicador', indicador.id, maps, currentYear);
      const visibleMetas = (maps.metasByIndicador.get(indicador.id) ?? []).filter((meta) => isVisibleMeta(meta, currentYear));
      return {
        id: indicador.id,
        nombre: indicador.nombre,
        level: 'indicador',
        effort: metric.effort,
        compliance: metric.compliance,
        hasChildren: visibleMetas.length > 0,
      };
    });
  }

  if (level === 'indicador') {
    const metas = (maps.metasByIndicador.get(id) ?? [])
      .filter((meta) => isVisibleMeta(meta, currentYear))
      .sort((a, b) => b.anio - a.anio);
    return metas.map((meta) => {
      const metric = getMetricFor('meta', meta.id, maps, currentYear);
      return {
        id: meta.id,
        nombre: getMetaLabel(meta),
        level: 'meta',
        effort: metric.effort,
        compliance: metric.compliance,
        hasChildren: false,
      };
    });
  }

  return [];
}

function getActionsFor(level: DashboardLevel, id: string, maps: HierarchyMaps, currentYear: number): DashboardActionItem[] {
  const visibleMetaIds = getVisibleMetaIds(maps.metaIdsByLevel[level].get(id) ?? [], maps, currentYear);
  const actions = visibleMetaIds.flatMap((metaId) => maps.actionsByMeta.get(metaId) ?? []);

  return actions.map((accion) => {
    const evidencias = (maps.evidenciasByAccion.get(accion.id) ?? []).map((evidencia) => ({
      id: evidencia.id,
      nombre: evidencia.nombre_archivo,
      url: evidencia.url_archivo,
    }));

    return {
      id: accion.id,
      descripcion: accion.descripcion,
      estado: accion.estado,
      evidencias,
    };
  });
}

function buildTreeNode(level: DashboardLevel, id: string, nombre: string, maps: HierarchyMaps, currentYear: number): DashboardTreeNode {
  const metric = getMetricFor(level, id, maps, currentYear);
  const children = getChildren(level, id, maps, currentYear).map((child) =>
    buildTreeNode(child.level, child.id, child.nombre, maps, currentYear)
  );

  return {
    id,
    nombre,
    level,
    effort: metric.effort,
    compliance: metric.compliance,
    totalActions: metric.totalActions,
    actions: getActionsFor(level, id, maps, currentYear),
    children,
  };
}

export async function getDashboardOverview() {
  const data = await fetchHierarchyData();
  const maps = buildHierarchyMaps(data);
  const currentYear = new Date().getFullYear();

  const visibleGlobalMetaIds = getVisibleMetaIds(data.metas.map((meta) => meta.id), maps, currentYear);
  const globalMetric = averageMetricByMeta(visibleGlobalMetaIds, maps);
  const axes = sortByOrderAndName(data.ejes)
    .map((eje) => buildTreeNode('eje', eje.id, eje.nombre, maps, currentYear))
    .sort((a, b) => {
      if (b.compliance !== a.compliance) {
        return b.compliance - a.compliance;
      }
      if (b.effort !== a.effort) {
        return b.effort - a.effort;
      }
      return a.nombre.localeCompare(b.nombre, 'es');
    });

  return {
    globalMetric,
    axes,
  };
}

export async function getDrilldown(levelParam: string, id: string) {
  const level = normalizeLevel(levelParam);
  const data = await fetchHierarchyData();
  const maps = buildHierarchyMaps(data);
  const currentYear = new Date().getFullYear();
  const metric = getMetricFor(level, id, maps, currentYear);
  const children = getChildren(level, id, maps, currentYear);

  return {
    level,
    nodeName: getNodeName(level, id, maps),
    metric,
    breadcrumbs: getBreadcrumbs(level, id, maps),
    childLevel: getChildLevel(level),
    children,
  };
}

export async function getItemDetail(levelParam: string, id: string) {
  const level = normalizeLevel(levelParam);
  const data = await fetchHierarchyData();
  const maps = buildHierarchyMaps(data);
  const currentYear = new Date().getFullYear();

  return {
    level,
    nodeName: getNodeName(level, id, maps),
    metric: getMetricFor(level, id, maps, currentYear),
    breadcrumbs: getBreadcrumbs(level, id, maps),
    children: getChildren(level, id, maps, currentYear),
  };
}
