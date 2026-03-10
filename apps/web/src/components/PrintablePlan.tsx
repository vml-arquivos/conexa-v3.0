/**
 * PrintablePlan — componente de impressão/PDF do planejamento do professor.
 * Renderizado em uma janela separada via window.open para garantir
 * layout limpo sem interferência do CSS do app.
 */

import type { Planning } from '../api/plannings';
import { safeJsonParse } from '../lib/safeJson';

// ─── Tipos internos ────────────────────────────────────────────────────────────
interface DayV2 {
  date: string;
  objectives?: Array<{
    campoExperiencia?: string;
    codigoBNCC?: string;
    objetivoBNCC?: string;
    objetivoCurriculo?: string;
    intencionalidade?: string;
    exemploAtividade?: string;
  }>;
  teacher?: {
    atividade?: string;
    recursos?: string;
    observacoes?: string;
  };
}

interface PlanningV2 {
  version: 2;
  classroomId?: string;
  days?: DayV2[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatarData(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}

function nomeProfessor(plan: Planning): string {
  const user = (plan as any).createdByUser;
  if (user?.firstName) return `${user.firstName} ${user.lastName ?? ''}`.trim();
  if (plan.createdBy) return plan.createdBy;
  return 'Não informado';
}

function nomeTurma(plan: Planning): string {
  const classroom = (plan as any).classroom;
  if (classroom?.name) return classroom.name;
  return plan.classroomId ?? 'Não informada';
}

function labelStatus(status: string): string {
  const map: Record<string, string> = {
    RASCUNHO: 'Rascunho',
    EM_REVISAO: 'Em Revisão',
    APROVADO: 'Aprovado',
    DEVOLVIDO: 'Devolvido',
    PUBLICADO: 'Publicado',
    EM_EXECUCAO: 'Em Execução',
    CONCLUIDO: 'Concluído',
    CANCELADO: 'Cancelado',
  };
  return map[status] ?? status;
}

// ─── HTML do documento imprimível ─────────────────────────────────────────────
export function buildPrintableHTML(plan: Planning): string {
  const rawDesc = (plan as any).description as string | undefined;
  const v2 = safeJsonParse<PlanningV2>(rawDesc, {} as PlanningV2);
  const isV2 = v2?.version === 2 && Array.isArray(v2.days);

  const periodo =
    plan.startDate && plan.endDate
      ? `${formatarData(plan.startDate)} a ${formatarData(plan.endDate)}`
      : plan.startDate
      ? formatarData(plan.startDate)
      : 'Não informado';

  // ── Conteúdo dos dias (V2) ──
  let diasHTML = '';
  if (isV2 && v2.days) {
    diasHTML = v2.days
      .map((day, idx) => {
        const dataFormatada = day.date
          ? day.date.split('-').reverse().join('/')
          : `Dia ${idx + 1}`;

        const objetivosHTML =
          day.objectives && day.objectives.length > 0
            ? `<div class="section">
                <div class="section-title">Objetivos da Matriz Pedagógica 2026</div>
                ${day.objectives
                  .map(
                    (obj) => `
                  <div class="objective-card">
                    ${obj.campoExperiencia ? `<div class="obj-campo">${obj.campoExperiencia.replace(/_/g, ' ')}</div>` : ''}
                    ${obj.codigoBNCC ? `<div class="obj-codigo">Código BNCC: ${obj.codigoBNCC}</div>` : ''}
                    ${obj.objetivoBNCC ? `<div class="obj-text"><strong>Objetivo BNCC:</strong> ${obj.objetivoBNCC}</div>` : ''}
                    ${obj.objetivoCurriculo ? `<div class="obj-text"><strong>Currículo em Movimento:</strong> ${obj.objetivoCurriculo}</div>` : ''}
                    ${obj.intencionalidade ? `<div class="obj-text"><strong>Intencionalidade:</strong> ${obj.intencionalidade}</div>` : ''}
                  </div>`,
                  )
                  .join('')}
              </div>`
            : '';

        const atividadeHTML = day.teacher?.atividade
          ? `<div class="section">
              <div class="section-title">Desenvolvimento da Atividade</div>
              <div class="field-value">${day.teacher.atividade.replace(/\n/g, '<br>')}</div>
            </div>`
          : '';

        const recursosHTML = day.teacher?.recursos
          ? `<div class="section">
              <div class="section-title">Recursos / Materiais</div>
              <div class="field-value">${day.teacher.recursos.replace(/\n/g, '<br>')}</div>
            </div>`
          : '';

        const observacoesHTML = day.teacher?.observacoes
          ? `<div class="section">
              <div class="section-title">Observações</div>
              <div class="field-value">${day.teacher.observacoes.replace(/\n/g, '<br>')}</div>
            </div>`
          : '';

        return `
          <div class="day-block">
            <div class="day-header">Dia ${idx + 1} — ${dataFormatada}</div>
            ${objetivosHTML}
            ${atividadeHTML}
            ${recursosHTML}
            ${observacoesHTML}
          </div>`;
      })
      .join('');
  } else {
    // ── Formato legado / V1 ──
    const desc = safeJsonParse<{ activities?: string; resources?: string; notes?: string }>(
      rawDesc,
      {},
    );
    const descLegacy =
      typeof rawDesc === 'string' && !rawDesc?.startsWith('{') ? rawDesc : null;
    const objectives = safeJsonParse<any[]>((plan as any).objectives, []);

    const objetivosHTML =
      objectives.length > 0
        ? `<div class="section">
            <div class="section-title">Objetivos da Matriz Pedagógica 2026</div>
            ${objectives
              .map(
                (obj: any) => `
              <div class="objective-card">
                ${obj.campo_label ? `<div class="obj-campo">${obj.campo_emoji ?? ''} ${obj.campo_label}</div>` : ''}
                ${obj.codigo_bncc ? `<div class="obj-codigo">Código BNCC: ${obj.codigo_bncc}</div>` : ''}
                ${obj.objetivo_bncc ? `<div class="obj-text"><strong>Objetivo BNCC:</strong> ${obj.objetivo_bncc}</div>` : ''}
                ${obj.objetivo_curriculo ? `<div class="obj-text"><strong>Currículo em Movimento:</strong> ${obj.objetivo_curriculo}</div>` : ''}
                ${obj.intencionalidade ? `<div class="obj-text"><strong>Intencionalidade:</strong> ${obj.intencionalidade}</div>` : ''}
              </div>`,
              )
              .join('')}
          </div>`
        : '';

    const atividadeHTML =
      desc.activities || descLegacy
        ? `<div class="section">
            <div class="section-title">Desenvolvimento da Atividade</div>
            <div class="field-value">${(desc.activities || descLegacy || '').replace(/\n/g, '<br>')}</div>
          </div>`
        : '';

    const recursosHTML = desc.resources
      ? `<div class="section">
          <div class="section-title">Recursos / Materiais</div>
          <div class="field-value">${desc.resources.replace(/\n/g, '<br>')}</div>
        </div>`
      : '';

    const observacoesHTML = desc.notes
      ? `<div class="section">
          <div class="section-title">Observações</div>
          <div class="field-value">${desc.notes.replace(/\n/g, '<br>')}</div>
        </div>`
      : '';

    diasHTML = `
      <div class="day-block">
        ${objetivosHTML}
        ${atividadeHTML}
        ${recursosHTML}
        ${observacoesHTML}
      </div>`;
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Planejamento — ${plan.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      color: #1a1a1a;
      background: #fff;
      padding: 0;
    }

    .page {
      max-width: 800px;
      margin: 0 auto;
      padding: 32px 40px;
    }

    /* ── Cabeçalho ── */
    .header {
      border-bottom: 3px solid #4f46e5;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }

    .header-logo {
      font-size: 10pt;
      color: #6366f1;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    .header-title {
      font-size: 18pt;
      font-weight: 800;
      color: #1e1b4b;
      line-height: 1.2;
      margin-bottom: 4px;
    }

    .header-subtitle {
      font-size: 9pt;
      color: #6b7280;
    }

    /* ── Metadados ── */
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 24px;
      background: #f8f9ff;
      border: 1px solid #e0e7ff;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 20px;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .meta-label {
      font-size: 8pt;
      font-weight: 700;
      color: #6366f1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .meta-value {
      font-size: 10.5pt;
      color: #111827;
      font-weight: 500;
    }

    .status-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 9pt;
      font-weight: 700;
      background: #e0e7ff;
      color: #3730a3;
    }

    /* ── Dias ── */
    .day-block {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 18px;
      page-break-inside: avoid;
    }

    .day-header {
      background: #4f46e5;
      color: #fff;
      font-size: 10pt;
      font-weight: 700;
      padding: 8px 14px;
      letter-spacing: 0.3px;
    }

    /* ── Seções ── */
    .section {
      padding: 10px 14px;
      border-bottom: 1px solid #f3f4f6;
    }

    .section:last-child {
      border-bottom: none;
    }

    .section-title {
      font-size: 8.5pt;
      font-weight: 700;
      color: #6366f1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }

    .field-value {
      font-size: 10.5pt;
      color: #374151;
      line-height: 1.55;
    }

    /* ── Objetivos ── */
    .objective-card {
      border-left: 3px solid #818cf8;
      padding: 6px 10px;
      margin-bottom: 8px;
      background: #f5f3ff;
      border-radius: 0 6px 6px 0;
    }

    .objective-card:last-child {
      margin-bottom: 0;
    }

    .obj-campo {
      font-size: 9pt;
      font-weight: 700;
      color: #4338ca;
      text-transform: uppercase;
      margin-bottom: 3px;
    }

    .obj-codigo {
      font-size: 8pt;
      color: #6b7280;
      font-family: monospace;
      margin-bottom: 3px;
    }

    .obj-text {
      font-size: 10pt;
      color: #374151;
      line-height: 1.5;
      margin-bottom: 2px;
    }

    /* ── Rodapé ── */
    .footer {
      margin-top: 28px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      font-size: 8.5pt;
      color: #9ca3af;
      display: flex;
      justify-content: space-between;
    }

    /* ── Botões de ação (só na tela) ── */
    .action-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #4f46e5;
      color: #fff;
      padding: 10px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }

    .action-bar span {
      flex: 1;
      font-size: 11pt;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .btn {
      padding: 7px 18px;
      border-radius: 6px;
      font-size: 10pt;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: opacity 0.15s;
    }

    .btn:hover { opacity: 0.85; }

    .btn-print {
      background: #fff;
      color: #4f46e5;
    }

    .btn-close {
      background: rgba(255,255,255,0.15);
      color: #fff;
    }

    @media print {
      .action-bar { display: none !important; }
      body { padding: 0; }
      .page { padding: 20px 28px; }
    }

    @media screen {
      body { padding-top: 56px; background: #f3f4f6; }
      .page {
        background: #fff;
        box-shadow: 0 2px 16px rgba(0,0,0,0.08);
        margin: 24px auto;
        border-radius: 12px;
      }
    }
  </style>
</head>
<body>
  <!-- Barra de ação (apenas na tela) -->
  <div class="action-bar">
    <span>📄 ${plan.title}</span>
    <button class="btn btn-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
    <button class="btn btn-close" onclick="window.close()">✕ Fechar</button>
  </div>

  <div class="page">
    <!-- Cabeçalho -->
    <div class="header">
      <div class="header-logo">Conexa — Sistema de Gestão Pedagógica</div>
      <div class="header-title">${plan.title}</div>
      <div class="header-subtitle">Planejamento de Aula — gerado em ${new Date().toLocaleDateString('pt-BR')}</div>
    </div>

    <!-- Metadados -->
    <div class="meta-grid">
      <div class="meta-item">
        <span class="meta-label">Turma</span>
        <span class="meta-value">${nomeTurma(plan)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Período</span>
        <span class="meta-value">${periodo}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Professor(a)</span>
        <span class="meta-value">${nomeProfessor(plan)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Status</span>
        <span class="meta-value">
          <span class="status-badge">${labelStatus(plan.status)}</span>
        </span>
      </div>
      ${
        plan.createdAt
          ? `<div class="meta-item">
              <span class="meta-label">Data de Criação</span>
              <span class="meta-value">${formatarData(plan.createdAt)}</span>
            </div>`
          : ''
      }
      ${
        (plan as any).reviewComment
          ? `<div class="meta-item" style="grid-column: span 2;">
              <span class="meta-label">Comentário da Revisão</span>
              <span class="meta-value" style="color:#dc2626;">${(plan as any).reviewComment}</span>
            </div>`
          : ''
      }
    </div>

    <!-- Conteúdo por dia -->
    ${diasHTML || '<div class="day-block"><div class="section"><div class="field-value" style="color:#9ca3af;">Nenhum conteúdo registrado neste planejamento.</div></div></div>'}

    <!-- Rodapé -->
    <div class="footer">
      <span>Conexa V3 — Sistema de Gestão Pedagógica</span>
      <span>Impresso em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
    </div>
  </div>

  <script>
    // Ao abrir, foca a janela para facilitar Ctrl+P
    window.focus();
  </script>
</body>
</html>`;
}

// ─── Funções de ação ──────────────────────────────────────────────────────────

/**
 * Abre uma nova janela com o planejamento formatado para impressão/PDF.
 */
export function imprimirPlanejamento(plan: Planning): void {
  const html = buildPrintableHTML(plan);
  const win = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
  if (!win) {
    alert('Permita pop-ups para este site para usar a impressão.');
    return;
  }
  win.document.write(html);
  win.document.close();
}

/**
 * Abre o diálogo de impressão diretamente (atalho para "Salvar como PDF").
 */
export function gerarPDF(plan: Planning): void {
  const html = buildPrintableHTML(plan);
  const win = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
  if (!win) {
    alert('Permita pop-ups para este site para usar a geração de PDF.');
    return;
  }
  win.document.write(html);
  win.document.close();
  // Aguarda o carregamento antes de abrir o diálogo de impressão
  win.onload = () => {
    setTimeout(() => {
      win.focus();
      win.print();
    }, 300);
  };
}
