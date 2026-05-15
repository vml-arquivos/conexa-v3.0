/**
 * exportPlanejamentosPDF — Gera PDF com planos de aula aprovados de um período.
 *
 * Usa jsPDF para gerar um documento multi-página com:
 * - Capa com período e unidade
 * - Uma seção por planejamento com: título, turma, professor, datas, atividades por dia
 */
import jsPDF from 'jspdf';

export interface PlanoParaPDF {
  id: string;
  titulo: string;
  turmaNome: string;
  professorNome: string;
  startDate: string;
  status: string;
  /** JSON stringificado do campo description (formato V2) */
  description?: string;
  reviewComment?: string;
}

interface DayV2 {
  date: string;
  teacher?: {
    atividade?: string;
    recursos?: string;
    observacoes?: string;
  };
}

interface PlanningV2Json {
  version: number;
  days?: DayV2[];
  range?: { start: string; days: number };
}

function safeParseV2(desc?: string): PlanningV2Json | null {
  if (!desc) return null;
  try {
    const parsed = JSON.parse(desc);
    if (parsed?.version === 2 && Array.isArray(parsed.days)) return parsed;
    return null;
  } catch {
    return null;
  }
}

function formatDateBR(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.substring(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function addWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

export function exportarPlanejamentosPDF(
  planos: PlanoParaPDF[],
  periodo: string,
  unidadeNome: string,
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;

  // ── Capa ──────────────────────────────────────────────────────────────────
  doc.setFillColor(49, 46, 129); // indigo-900
  doc.rect(0, 0, pageW, 60, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Planos de Aula', margin, 28);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(unidadeNome, margin, 38);
  doc.text(`Período: ${periodo}`, margin, 46);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, margin, 54);

  doc.setFontSize(10);
  doc.setTextColor(180, 180, 200);
  doc.text(`${planos.length} plano(s) aprovado(s)`, margin, 62);

  let y = 75;
  doc.setTextColor(30, 30, 30);

  // ── Planos ────────────────────────────────────────────────────────────────
  planos.forEach((plano, idx) => {
    // Nova página para cada plano (exceto o primeiro)
    if (idx > 0) {
      doc.addPage();
      y = 20;
    }

    // Cabeçalho do plano
    doc.setFillColor(238, 242, 255); // indigo-50
    doc.roundedRect(margin, y, contentW, 28, 3, 3, 'F');

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(49, 46, 129);
    y = addWrappedText(doc, plano.titulo || 'Sem título', margin + 4, y + 8, contentW - 8, 6);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 120);
    doc.text(
      `Turma: ${plano.turmaNome}   |   Professor(a): ${plano.professorNome}   |   Início: ${formatDateBR(plano.startDate)}`,
      margin + 4,
      y + 2,
    );
    y += 10;

    // Separador
    doc.setDrawColor(200, 200, 220);
    doc.line(margin, y, margin + contentW, y);
    y += 6;

    // Dias do planejamento
    const v2 = safeParseV2(plano.description);
    if (v2 && v2.days && v2.days.length > 0) {
      v2.days.forEach((day, dayIdx) => {
        // Verificar espaço na página
        if (y > pageH - 40) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(49, 46, 129);
        doc.text(`Dia ${dayIdx + 1} — ${formatDateBR(day.date)}`, margin, y);
        y += 5;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);

        if (day.teacher?.atividade) {
          doc.setFontSize(9);
          doc.setTextColor(80, 80, 80);
          doc.text('Atividade:', margin + 3, y);
          y += 4;
          doc.setTextColor(30, 30, 30);
          y = addWrappedText(doc, day.teacher.atividade, margin + 6, y, contentW - 10, 4.5);
          y += 2;
        }

        if (day.teacher?.recursos) {
          if (y > pageH - 30) { doc.addPage(); y = 20; }
          doc.setFontSize(9);
          doc.setTextColor(80, 80, 80);
          doc.text('Recursos:', margin + 3, y);
          y += 4;
          doc.setTextColor(30, 30, 30);
          y = addWrappedText(doc, day.teacher.recursos, margin + 6, y, contentW - 10, 4.5);
          y += 2;
        }

        if (day.teacher?.observacoes) {
          if (y > pageH - 30) { doc.addPage(); y = 20; }
          doc.setFontSize(9);
          doc.setTextColor(80, 80, 80);
          doc.text('Observações:', margin + 3, y);
          y += 4;
          doc.setTextColor(30, 30, 30);
          y = addWrappedText(doc, day.teacher.observacoes, margin + 6, y, contentW - 10, 4.5);
          y += 2;
        }

        // Linha separadora entre dias
        doc.setDrawColor(230, 230, 240);
        doc.line(margin + 3, y, margin + contentW - 3, y);
        y += 5;
      });
    } else {
      // Formato legado ou sem dias
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text('(Formato legado — visualize o plano completo no sistema)', margin + 3, y);
      y += 8;
    }

    // Rodapé do plano
    if (plano.reviewComment) {
      if (y > pageH - 30) { doc.addPage(); y = 20; }
      doc.setFillColor(254, 243, 199); // amber-100
      doc.roundedRect(margin, y, contentW, 14, 2, 2, 'F');
      doc.setFontSize(8);
      doc.setTextColor(120, 80, 0);
      doc.text('Observação da coordenação:', margin + 3, y + 5);
      y = addWrappedText(doc, plano.reviewComment, margin + 3, y + 10, contentW - 6, 4);
      y += 4;
    }

    y += 8;
  });

  // Numeração de páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text(`Página ${i} de ${totalPages}`, pageW - margin - 20, pageH - 8);
    doc.text('COCRIS — Conexa V3', margin, pageH - 8);
  }

  // Download
  const nomeArquivo = `planos-aula-${periodo.replace(/\//g, '-')}.pdf`;
  doc.save(nomeArquivo);
}
