'use client';

import { useState } from 'react';
import { jsPDF } from 'jspdf';
import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardMetric, DashboardTreeNode } from '@/lib/types';

interface ExportReportButtonProps {
  globalMetric: DashboardMetric;
  axes: DashboardTreeNode[];
}

function formatReportDate(date: Date) {
  return new Intl.DateTimeFormat('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function loadImageDataUrl(src: string) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo crear el contexto del logo'));
        return;
      }
      ctx.drawImage(image, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = () => reject(new Error('No se pudo cargar el logo'));
    image.src = src;
  });
}

function drawAxesTable(pdf: jsPDF, axes: DashboardTreeNode[], startY: number) {
  const rowHeight = 8;
  const colX = { eje: 15, focos: 118, esfuerzo: 150, cumplimiento: 177 };
  let y = startY;

  const drawHeader = () => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('Eje', colX.eje, y);
    pdf.text('Focos', colX.focos, y, { align: 'right' });
    pdf.text('Esfuerzo', colX.esfuerzo, y, { align: 'right' });
    pdf.text('Cumplimiento', colX.cumplimiento, y, { align: 'right' });
    y += 2;
    pdf.setDrawColor(210, 210, 210);
    pdf.line(15, y, 195, y);
    y += 5;
    pdf.setFont('helvetica', 'normal');
  };

  drawHeader();

  axes.forEach((axis) => {
    pdf.setFontSize(9);
    pdf.text(axis.nombre, colX.eje, y);
    pdf.text(String(axis.children.length), colX.focos, y, { align: 'right' });
    pdf.text(`${axis.effort.toFixed(1)}%`, colX.esfuerzo, y, { align: 'right' });
    pdf.text(`${axis.compliance.toFixed(1)}%`, colX.cumplimiento, y, { align: 'right' });
    y += rowHeight;
  });
}

export function ExportReportButton({ globalMetric, axes }: ExportReportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const now = new Date();
      const reportDate = formatReportDate(now);
      const pdf = new jsPDF('p', 'mm', 'a4');

      const logoData = await loadImageDataUrl('/logo_sgc_90.png');
      pdf.addImage(logoData, 'PNG', 15, 14, 42, 21);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.text('Plan Estratégico', 62, 22);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.text("Saint George's College", 62, 29);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(15);
      pdf.text(`Reporte al día (${reportDate})`, 15, 45);
      pdf.text('Ejecución Plan Estratégico', 15, 53);
      pdf.setFontSize(13);
      pdf.text('Indicadores globales', 15, 66);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('Esfuerzo total', 15, 78);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text('Porcentaje de acciones completadas sobre el total de acciones registradas.', 15, 85);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${globalMetric.effort.toFixed(1)}%`, 15, 92);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Acciones completadas: ${globalMetric.completedActions} de ${globalMetric.totalActions}`, 15, 98);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Cumplimiento total', 15, 109);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Promedio de avance real frente a la meta definida para cada meta anual visible.', 15, 116);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${globalMetric.compliance.toFixed(1)}%`, 15, 123);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Metas consideradas: ${globalMetric.metasCount}`, 15, 129);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('Ejes y valores actuales', 15, 141);
      drawAxesTable(pdf, axes, 151);

      pdf.save(`reporte-plan-estrategico-${now.toISOString().slice(0, 10)}.pdf`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleExport}
      data-report-exclude="true"
      className="gap-2"
    >
      <FileDown className="h-4 w-4" />
      {loading ? 'Generando...' : 'Reporte PDF'}
    </Button>
  );
}
