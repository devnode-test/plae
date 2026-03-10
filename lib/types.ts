export interface Eje {
  id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  created_at: string;
}

export interface Foco {
  id: string;
  eje_id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  created_at: string;
}

export interface Objetivo {
  id: string;
  foco_id: string;
  responsable_id: string | null;
  nombre: string;
  descripcion: string | null;
  orden: number;
  año_inicio: number;
  año_fin: number;
  created_at: string;
}

export interface Indicador {
  id: string;
  objetivo_id: string;
  nombre: string;
  descripcion: string | null;
  tipo_medida: string | null;
  created_at: string;
}

export interface MetaAnual {
  id: string;
  indicador_id: string;
  año: number;
  valor_meta: number;
  unidad_medida: string | null;
  valor_real: number;
  acciones_edicion_habilitada: boolean;
  created_at: string;
}

export interface Accion {
  id: string;
  meta_anual_id: string;
  descripcion: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: 'pendiente' | 'en_progreso' | 'completada';
  created_at: string;
}

export interface Evidencia {
  id: string;
  accion_id: string;
  tipo_archivo: 'pdf' | 'excel' | 'word' | 'jpg' | 'png';
  nombre_archivo: string;
  url_archivo: string;
  created_at: string;
}

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'responsable';
  created_at: string;
}

export type DashboardLevel = 'eje' | 'foco' | 'objetivo' | 'indicador' | 'meta';

export interface DashboardMetric {
  effort: number;
  compliance: number;
  metasCount: number;
  completedActions: number;
  totalActions: number;
}

export interface DashboardItem {
  id: string;
  nombre: string;
  level: DashboardLevel;
  effort: number;
  compliance: number;
  hasChildren: boolean;
}

export interface DashboardTreeNode {
  id: string;
  nombre: string;
  level: DashboardLevel;
  effort: number;
  compliance: number;
  totalActions: number;
  actions: DashboardActionItem[];
  children: DashboardTreeNode[];
}

export interface DashboardActionEvidence {
  id: string;
  nombre: string;
  url: string;
}

export interface DashboardActionItem {
  id: string;
  descripcion: string;
  estado: string;
  evidencias: DashboardActionEvidence[];
}

export interface BreadcrumbItem {
  id: string;
  level: DashboardLevel;
  nombre: string;
}
