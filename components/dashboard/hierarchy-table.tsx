'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Eye, Search } from 'lucide-react';
import { DashboardTreeNode } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface HierarchyTableProps {
  roots: DashboardTreeNode[];
}

interface FlatNode {
  id: string;
  nombre: string;
  level: DashboardTreeNode['level'];
  effort: number;
  compliance: number;
  depth: number;
  hasChildren: boolean;
  node: DashboardTreeNode;
}

function flattenNodes(nodes: DashboardTreeNode[], expanded: Set<string>, depth = 0): FlatNode[] {
  const rows: FlatNode[] = [];

  for (const node of nodes) {
    const hasChildren = node.children.length > 0;
    rows.push({
      id: node.id,
      nombre: node.nombre,
      level: node.level,
      effort: node.effort,
      compliance: node.compliance,
      depth,
      hasChildren,
      node,
    });

    if (hasChildren && expanded.has(node.id)) {
      rows.push(...flattenNodes(node.children, expanded, depth + 1));
    }
  }

  return rows;
}

function levelLabel(level: DashboardTreeNode['level']) {
  if (level === 'eje') return 'Eje';
  if (level === 'foco') return 'Foco';
  if (level === 'objetivo') return 'Objetivo';
  if (level === 'indicador') return 'Indicador';
  return 'Meta';
}

function collectDescendantIds(node: DashboardTreeNode): string[] {
  return node.children.flatMap((child) => [child.id, ...collectDescendantIds(child)]);
}

export function HierarchyTable({ roots }: HierarchyTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<DashboardTreeNode | null>(null);
  const rows = useMemo(() => flattenNodes(roots, expanded), [roots, expanded]);

  const toggleRow = (node: DashboardTreeNode) => {
    const descendantIds = collectDescendantIds(node);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(node.id)) {
        next.delete(node.id);
        descendantIds.forEach((id) => next.delete(id));
      } else {
        next.add(node.id);
      }
      return next;
    });
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card p-6 text-sm text-muted-foreground">
        No hay datos para mostrar.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border bg-card">
      <div className="hidden grid-cols-[minmax(0,1fr)_150px_130px] gap-3 border-b px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
        <span>Jerarquía</span>
        <span className="text-right">Esfuerzo</span>
        <span className="text-right">Cumplimiento</span>
      </div>

      <div className="divide-y">
        {rows.map((row) => {
          const isExpanded = expanded.has(row.id);
          const levelRowClass =
            row.level === 'eje'
              ? 'bg-primary/5'
              : row.level === 'foco'
                ? 'bg-blue-500/5'
                : row.level === 'objetivo'
                  ? 'bg-emerald-500/5'
                  : row.level === 'indicador'
                    ? 'bg-amber-500/5'
                    : 'bg-violet-500/5';

          return (
            <div key={row.id} className={`px-4 py-3 ${levelRowClass}`}>
              <div className="md:hidden">
                <div className="w-full">
                  <div className="flex items-start gap-2" style={{ paddingLeft: `${row.depth * 14}px` }}>
                    {row.hasChildren ? (
                      <button
                        type="button"
                        onClick={() => toggleRow(row.node)}
                        className="mt-0.5 rounded p-1 text-muted-foreground hover:bg-accent"
                        aria-label={isExpanded ? 'Contraer' : 'Expandir'}
                      >
                        <ChevronRight className={`h-4 w-4 transition ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>
                    ) : (
                      <span className="mt-1 inline-block h-6 w-6" />
                    )}
                    <div className="w-full">
                      <div className="text-sm font-medium leading-snug">{row.nombre}</div>
                      <div className="text-xs text-muted-foreground">{levelLabel(row.level)}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap justify-end gap-3 text-right text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      {row.node.totalActions > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSelectedNode(row.node)}
                          className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          aria-label="Ver acciones"
                        >
                          <Search className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                      Esfuerzo: {row.effort.toFixed(1)}%
                    </span>
                    <span>Cumplimiento: {row.compliance.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              <div className="hidden grid-cols-[minmax(0,1fr)_150px_130px] items-center gap-3 md:grid">
                <div className="flex min-w-0 items-center gap-2" style={{ paddingLeft: `${row.depth * 16}px` }}>
                  {row.hasChildren ? (
                    <button
                      type="button"
                      onClick={() => toggleRow(row.node)}
                      className="rounded p-1 text-muted-foreground hover:bg-accent"
                      aria-label={isExpanded ? 'Contraer' : 'Expandir'}
                    >
                      <ChevronRight className={`h-4 w-4 transition ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                  ) : (
                    <span className="inline-block h-6 w-6" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{row.nombre}</div>
                    <div className="text-xs text-muted-foreground">{levelLabel(row.level)}</div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1 text-right text-sm">
                  {row.node.totalActions > 0 ? (
                    <button
                      type="button"
                      onClick={() => setSelectedNode(row.node)}
                      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                      aria-label="Ver acciones"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  ) : null}
                  <span>{row.effort.toFixed(1)}%</span>
                </div>
                <div className="text-right text-sm">{row.compliance.toFixed(1)}%</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
      <Dialog open={Boolean(selectedNode)} onOpenChange={(open) => (!open ? setSelectedNode(null) : null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedNode ? `Acciones de ${selectedNode.nombre}` : 'Acciones'}</DialogTitle>
          </DialogHeader>
          {selectedNode && selectedNode.actions.length > 0 ? (
            <div className="space-y-3">
              {selectedNode.actions.map((accion) => (
                <div key={accion.id} className="rounded-lg border bg-card p-3">
                  <p className="text-sm font-medium">{accion.descripcion}</p>
                  <div className="mt-1 text-xs text-muted-foreground">Estado: {accion.estado}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Evidencias: {accion.evidencias.length}</span>
                    {accion.evidencias.length > 0 ? (
                      <Link
                        href={accion.evidencias[0].url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-accent"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Visualizar
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin evidencia</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay acciones para mostrar.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
