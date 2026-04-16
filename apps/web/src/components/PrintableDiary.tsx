/**
 * PrintableDiary — Geração de PDF/impressão do Diário da Turma.
 *
 * Segue o mesmo padrão de PrintablePlan.tsx: gera HTML completo com CSS
 * inline e abre em nova janela para impressão / "Salvar como PDF".
 *
 * Não adiciona dependências nem altera o lockfile.
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface DiaryObjective {
  campoExperiencia?: string;
  codigoBNCC?: string;
  objetivoBNCC?: string;
  objetivoCurriculo?: string;
  objetivoCurriculoDF?: string;
  intencionalidade?: string;
  intencionalidadePedagogica?: string;
}

export interface DiaryObservacaoIndividual {
  /** ID do descritor comportamental */
  comportamento: string;
  /** Label legível do descritor */
  label: string;
  /** Grupo: desempenho | comportamento | alerta */
  grupo: string;
  /** IDs das crianças que se enquadram */
  criancaIds: string[];
}

export interface DiaryPrintData {
  // Metadados
  data: string;               // YYYY-MM-DD
  turmaNome: string;
  unidadeNome?: string;
  professorNome: string;

  // Planejamento
  planejamentoTitulo?: string;
  planejamentoAtividade?: string;
  planejamentoRecursos?: string;
  planejamentoObjetivos?: DiaryObjective[];

  // Execução
  statusExecucaoPlano?: string;
  execucaoPlanejamento?: string;

  // Avaliação da Prática
  avaliacaoPlanoAula?: string;
  momentoDestaque?: string;
  reflexaoPedagogica?: string;
  /** Encaminhamentos pedagógicos (campo observations no backend) */
  encaminhamentos?: string;

  // Presença e Rotina
  presencas: number;
  ausencias: number;
  totalAlunos?: number;
  climaEmocional?: string;
  /** Aceita Record<string,boolean> (novo) ou RotinaItem[] legado {momento, concluido} */
  rotina?: Record<string, boolean> | Array<{ momento: string; concluido: boolean; descricao?: string }>;

  // Observações individuais (descritores)
  observacoesIndividuais?: DiaryObservacaoIndividual[];

  // Crianças (para resolver nomes)
  criancas?: Array<{ id: string; firstName: string; lastName: string }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatarData(iso: string): string {
  if (!iso) return '';
  try {
    const [y, m, d] = iso.split('-');
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    return dt.toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function labelStatus(status: string): string {
  const map: Record<string, string> = {
    CUMPRIDO: 'Cumprido',
    PARCIAL: 'Parcialmente cumprido',
    NAO_REALIZADO: 'Não realizado',
    BOM: 'Bom',
    OTIMO: 'Ótimo',
    REGULAR: 'Regular',
    DIFICIL: 'Difícil',
  };
  return map[status] ?? status ?? '';
}

function labelClima(clima: string): string {
  const map: Record<string, string> = {
    BOM: 'Bom',
    OTIMO: 'Ótimo',
    REGULAR: 'Regular',
    DIFICIL: 'Difícil',
    AGITADO: 'Agitado',
    TRANQUILO: 'Tranquilo',
  };
  return map[clima] ?? clima ?? '';
}

const ROTINA_LABELS: Record<string, string> = {
  acolhida: 'Acolhida',
  rodaConversa: 'Roda de Conversa',
  atividadeDirigida: 'Atividade Dirigida',
  brincadeiraLivre: 'Brincadeira Livre',
  higiene: 'Higiene',
  refeicao: 'Refeição',
  repouso: 'Repouso',
  atividadeComplementar: 'Atividade Complementar',
  rodaEncerramento: 'Roda de Encerramento',
};

const GRUPO_LABELS: Record<string, string> = {
  desempenho: 'Desempenho e Aprendizagem',
  comportamento: 'Comportamento e Regulação',
  alerta: 'Desenvolvimento e Sinais de Alerta',
};

function nomeCrianca(
  id: string,
  criancas?: Array<{ id: string; firstName: string; lastName: string }>,
): string {
  if (!id) return '';
  const c = criancas?.find(c => c.id === id);
  if (!c) return ''; // nunca exibir IDs criptografados
  const nome = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim();
  return nome || '';
}

function esc(s?: string | null): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Gerador de HTML ──────────────────────────────────────────────────────────

export function buildDiaryPrintableHTML(d: DiaryPrintData): string {
  const dataFormatada = formatarData(d.data);
  const totalAlunos = d.totalAlunos ?? (d.presencas + d.ausencias);
  const presencaPct = totalAlunos > 0 ? Math.round((d.presencas / totalAlunos) * 100) : 0;

  // ── Bloco: Planejamento do Dia ──
  let planejamentoHTML = '';
  if (d.planejamentoTitulo || d.planejamentoAtividade || (d.planejamentoObjetivos?.length ?? 0) > 0) {
    const objetivosHTML = (d.planejamentoObjetivos ?? []).length > 0
      ? `<div class="section">
          <div class="section-title">Objetivos da Matriz Pedagógica 2026</div>
          ${(d.planejamentoObjetivos ?? []).map(obj => `
            <div class="objective-card">
              <div class="obj-campo">${esc((obj.campoExperiencia ?? '').replace(/_/g, ' ') || 'Não informado')}</div>
              ${obj.codigoBNCC ? `<div class="obj-codigo">Código BNCC: ${esc(obj.codigoBNCC)}</div>` : ''}
              ${obj.objetivoBNCC ? `<div class="obj-text"><strong>Objetivo BNCC:</strong> ${esc(obj.objetivoBNCC)}</div>` : ''}
              ${(obj.objetivoCurriculoDF ?? obj.objetivoCurriculo) ? `<div class="obj-text"><strong>Currículo em Movimento — DF:</strong> ${esc(obj.objetivoCurriculoDF ?? obj.objetivoCurriculo ?? '')}</div>` : ''}
              ${(obj.intencionalidadePedagogica ?? obj.intencionalidade) ? `<div class="obj-text"><strong>Intencionalidade Pedagógica:</strong> ${esc(obj.intencionalidadePedagogica ?? obj.intencionalidade ?? '')}</div>` : ''}
            </div>`).join('')}
        </div>`
      : '';

    const atividadeHTML = d.planejamentoAtividade
      ? `<div class="section">
          <div class="section-title">Desenvolvimento da Atividade</div>
          <div class="field-value">${esc(d.planejamentoAtividade).replace(/\n/g, '<br>')}</div>
        </div>`
      : '';

    const recursosHTML = d.planejamentoRecursos
      ? `<div class="section">
          <div class="section-title">Recursos e Materiais</div>
          <div class="field-value">${esc(d.planejamentoRecursos).replace(/\n/g, '<br>')}</div>
        </div>`
      : '';

    planejamentoHTML = `
      <div class="block">
        <div class="block-header indigo-header">Plano de Aula — ${esc(d.planejamentoTitulo ?? 'Planejamento do Dia')}</div>
        ${objetivosHTML}
        ${atividadeHTML}
        ${recursosHTML}
      </div>`;
  }

  // ── Bloco: Execução do Plano ──
  let execucaoHTML = '';
  if (d.statusExecucaoPlano || d.execucaoPlanejamento) {
    execucaoHTML = `
      <div class="block">
        <div class="block-header emerald-header">Execução do Plano</div>
        <div class="section">
          ${d.statusExecucaoPlano ? `<div class="badge-row"><span class="badge badge-${d.statusExecucaoPlano.toLowerCase()}">${esc(labelStatus(d.statusExecucaoPlano))}</span></div>` : ''}
          ${d.execucaoPlanejamento ? `<div class="field-value mt-8">${esc(d.execucaoPlanejamento).replace(/\n/g, '<br>')}</div>` : ''}
        </div>
      </div>`;
  }

  // ── Bloco: Avaliação da Prática ──
  let avaliacaoHTML = '';
  const temAvaliacao = d.avaliacaoPlanoAula || d.momentoDestaque || d.reflexaoPedagogica || d.encaminhamentos;
  if (temAvaliacao) {
    avaliacaoHTML = `
      <div class="block">
        <div class="block-header purple-header">Avaliação da Prática Docente</div>
        ${d.avaliacaoPlanoAula ? `
          <div class="section highlight-section">
            <div class="section-title">Avaliação do Plano de Aula</div>
            <div class="field-value">${esc(d.avaliacaoPlanoAula).replace(/\n/g, '<br>')}</div>
          </div>` : ''}
        ${d.momentoDestaque ? `
          <div class="section">
            <div class="section-title">Momento de Destaque</div>
            <div class="field-value">${esc(d.momentoDestaque).replace(/\n/g, '<br>')}</div>
          </div>` : ''}
        ${d.reflexaoPedagogica ? `
          <div class="section">
            <div class="section-title">Reflexão Pedagógica</div>
            <div class="field-value">${esc(d.reflexaoPedagogica).replace(/\n/g, '<br>')}</div>
          </div>` : ''}
        ${d.encaminhamentos ? `
          <div class="section">
            <div class="section-title">Encaminhamentos Pedagógicos</div>
            <div class="field-value">${esc(d.encaminhamentos).replace(/\n/g, '<br>')}</div>
          </div>` : ''}
      </div>`;
  }

  // ── Bloco: Presença e Rotina ──
  // Normalizar rotina: aceita Record<string,boolean> ou RotinaItem[] legado
  const rotinaItems: Array<{ label: string; realizado: boolean }> = (() => {
    const r = d.rotina;
    if (!r) return [];
    if (Array.isArray(r)) {
      // Formato legado: [{momento, concluido, descricao}]
      return r.map(item => ({
        label: ROTINA_LABELS[item.momento] ?? item.momento,
        realizado: Boolean(item.concluido),
      }));
    }
    // Formato novo: Record<string, boolean>
    return Object.entries(r).map(([key, val]) => ({
      label: ROTINA_LABELS[key] ?? key,
      realizado: Boolean(val),
    }));
  })();

  const rotinaHTML = rotinaItems.length > 0
    ? `<div class="rotina-grid">
        ${rotinaItems.map(item => `
          <div class="rotina-item ${item.realizado ? 'rotina-ok' : 'rotina-nao'}">
            <span class="rotina-icon">${item.realizado ? '✓' : '○'}</span>
            ${esc(item.label)}
          </div>`).join('')}
      </div>`
    : '<p class="field-value" style="color:#9ca3af;">Rotina não registrada.</p>';

  const presencaRotina = `
    <div class="block">
      <div class="block-header green-header">Presença e Rotina do Dia</div>
      <div class="section">
        <div class="presenca-row">
          <div class="presenca-card presenca-ok">
            <div class="presenca-num">${d.presencas}</div>
            <div class="presenca-label">Presentes</div>
          </div>
          <div class="presenca-card presenca-aus">
            <div class="presenca-num">${d.ausencias}</div>
            <div class="presenca-label">Ausentes</div>
          </div>
          <div class="presenca-card presenca-total">
            <div class="presenca-num">${totalAlunos}</div>
            <div class="presenca-label">Total</div>
          </div>
          ${d.climaEmocional ? `
          <div class="presenca-card presenca-clima">
            <div class="presenca-num" style="font-size:11pt;">${esc(labelClima(d.climaEmocional))}</div>
            <div class="presenca-label">Clima Emocional</div>
          </div>` : ''}
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:${presencaPct}%;"></div>
        </div>
        <p style="font-size:8.5pt;color:#6b7280;margin-top:4px;">${presencaPct}% de presença na turma</p>
      </div>
      <div class="section">
        <div class="section-title">Rotina do Dia</div>
        ${rotinaHTML}
      </div>
    </div>`;

  // ── Bloco: Observações Individuais ──
  let obsHTML = '';
  const obs = (d.observacoesIndividuais ?? []).filter(o =>
    o.criancaIds.length > 0 &&
    o.criancaIds.some(id => nomeCrianca(id, d.criancas).length > 0)
  );
  if (obs.length > 0) {
    // Agrupar por grupo
    const grupos: Record<string, DiaryObservacaoIndividual[]> = {};
    for (const o of obs) {
      if (!grupos[o.grupo]) grupos[o.grupo] = [];
      grupos[o.grupo].push(o);
    }

    const gruposHTML = Object.entries(grupos).map(([grupo, items]) => `
      <div class="obs-grupo">
        <div class="obs-grupo-title">${esc(GRUPO_LABELS[grupo] ?? grupo)}</div>
        ${items.map(item => `
          <div class="obs-item">
            <div class="obs-comportamento">${esc(item.label)}</div>
            <div class="obs-criancas">
              ${item.criancaIds
                .map(id => nomeCrianca(id, d.criancas))
                .filter(n => n.length > 0)
                .map(n => `<span class="obs-chip">${esc(n)}</span>`)
                .join('')}
            </div>
          </div>`).join('')}
      </div>`).join('');

    obsHTML = `
      <div class="block">
        <div class="block-header amber-header">Observações Individuais por Criança</div>
        <div class="section">
          ${gruposHTML}
        </div>
      </div>`;
  }

  // ── CSS ──
  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      color: #1a1a1a;
      background: #fff;
    }

    .page {
      max-width: 820px;
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
      font-size: 9pt;
      color: #6366f1;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .header-title {
      font-size: 17pt;
      font-weight: 800;
      color: #1e1b4b;
      line-height: 1.2;
      margin-bottom: 4px;
    }
    .header-subtitle {
      font-size: 9pt;
      color: #6b7280;
    }

    /* ── Meta ── */
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px 20px;
      background: #f8f9ff;
      border: 1px solid #e0e7ff;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 20px;
    }
    .meta-item { display: flex; flex-direction: column; gap: 2px; }
    .meta-label { font-size: 7.5pt; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 0.5px; }
    .meta-value { font-size: 10pt; color: #111827; font-weight: 500; }

    /* ── Blocos ── */
    .block {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    .block-header {
      font-size: 9.5pt;
      font-weight: 700;
      padding: 8px 14px;
      letter-spacing: 0.2px;
    }
    .indigo-header  { background: #4f46e5; color: #fff; }
    .emerald-header { background: #059669; color: #fff; }
    .purple-header  { background: #7c3aed; color: #fff; }
    .green-header   { background: #16a34a; color: #fff; }
    .amber-header   { background: #d97706; color: #fff; }

    /* ── Seções ── */
    .section {
      padding: 10px 14px;
      border-bottom: 1px solid #f3f4f6;
    }
    .section:last-child { border-bottom: none; }
    .section-title {
      font-size: 8pt;
      font-weight: 700;
      color: #6366f1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .highlight-section { background: #faf5ff; }
    .field-value { font-size: 10.5pt; color: #374151; line-height: 1.55; }
    .mt-8 { margin-top: 8px; }

    /* ── Objetivos ── */
    .objective-card {
      border-left: 3px solid #818cf8;
      padding: 6px 10px;
      margin-bottom: 8px;
      background: #f5f3ff;
      border-radius: 0 6px 6px 0;
    }
    .objective-card:last-child { margin-bottom: 0; }
    .obj-campo { font-size: 8.5pt; font-weight: 700; color: #4338ca; text-transform: uppercase; margin-bottom: 3px; }
    .obj-codigo { font-size: 7.5pt; color: #6b7280; font-family: monospace; margin-bottom: 3px; }
    .obj-text { font-size: 10pt; color: #374151; line-height: 1.5; margin-bottom: 2px; }

    /* ── Badge status ── */
    .badge-row { margin-bottom: 6px; }
    .badge {
      display: inline-block;
      padding: 3px 12px;
      border-radius: 999px;
      font-size: 9pt;
      font-weight: 700;
    }
    .badge-cumprido    { background: #d1fae5; color: #065f46; }
    .badge-parcial     { background: #fef3c7; color: #92400e; }
    .badge-nao_realizado { background: #fee2e2; color: #991b1b; }

    /* ── Presença ── */
    .presenca-row {
      display: flex;
      gap: 12px;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }
    .presenca-card {
      flex: 1;
      min-width: 80px;
      border-radius: 8px;
      padding: 10px 12px;
      text-align: center;
    }
    .presenca-ok    { background: #d1fae5; border: 1px solid #6ee7b7; }
    .presenca-aus   { background: #fee2e2; border: 1px solid #fca5a5; }
    .presenca-total { background: #e0e7ff; border: 1px solid #a5b4fc; }
    .presenca-clima { background: #fef3c7; border: 1px solid #fcd34d; }
    .presenca-num   { font-size: 18pt; font-weight: 800; color: #111827; }
    .presenca-label { font-size: 7.5pt; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-top: 2px; }
    .progress-bar-wrap {
      height: 8px;
      background: #e5e7eb;
      border-radius: 999px;
      overflow: hidden;
      margin-top: 6px;
    }
    .progress-bar-fill {
      height: 100%;
      background: #10b981;
      border-radius: 999px;
    }

    /* ── Rotina ── */
    .rotina-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      margin-top: 6px;
    }
    .rotina-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 8px;
      border-radius: 6px;
      font-size: 9.5pt;
    }
    .rotina-ok  { background: #d1fae5; color: #065f46; }
    .rotina-nao { background: #f3f4f6; color: #9ca3af; }
    .rotina-icon { font-size: 10pt; font-weight: 700; }

    /* ── Observações individuais ── */
    .obs-grupo { margin-bottom: 14px; }
    .obs-grupo:last-child { margin-bottom: 0; }
    .obs-grupo-title {
      font-size: 8pt;
      font-weight: 700;
      color: #92400e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
      padding-bottom: 3px;
      border-bottom: 1px solid #fde68a;
    }
    .obs-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 6px;
      padding: 6px 8px;
      background: #fffbeb;
      border-radius: 6px;
      border: 1px solid #fde68a;
    }
    .obs-comportamento {
      font-size: 9.5pt;
      font-weight: 600;
      color: #78350f;
      min-width: 180px;
      flex-shrink: 0;
    }
    .obs-criancas { display: flex; flex-wrap: wrap; gap: 4px; }
    .obs-chip {
      display: inline-block;
      background: #fff;
      border: 1px solid #d97706;
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 8.5pt;
      color: #92400e;
      font-weight: 500;
    }

    /* ── Rodapé ── */
    .footer {
      margin-top: 24px;
      padding-top: 10px;
      border-top: 1px solid #e5e7eb;
      font-size: 8pt;
      color: #9ca3af;
      display: flex;
      justify-content: space-between;
    }

    /* ── Barra de ação (só na tela) ── */
    .action-bar {
      position: fixed;
      top: 0; left: 0; right: 0;
      background: #4f46e5;
      color: #fff;
      padding: 10px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .action-bar span { flex: 1; font-size: 11pt; font-weight: 600; }
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
    .btn-print  { background: #fff; color: #4f46e5; }
    .btn-pdf    { background: #10b981; color: #fff; }
    .btn-close  { background: rgba(255,255,255,0.15); color: #fff; }

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
  `;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Diário da Turma — ${esc(d.turmaNome)} — ${d.data.split('-').reverse().join('/')}</title>
  <style>${css}</style>
</head>
<body>
  <!-- Barra de ação -->
  <div class="action-bar">
    <span>📋 Diário da Turma — ${esc(d.turmaNome)} — ${d.data.split('-').reverse().join('/')}</span>
    <button class="btn btn-pdf" onclick="(function(){ var p=document.createElement('p'); p.style.cssText='position:fixed;top:56px;left:50%;transform:translateX(-50%);background:#1e1b4b;color:#fff;padding:8px 20px;border-radius:8px;font-size:10pt;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.3);'; p.textContent='Na janela de impressão, escolha Destino → Salvar como PDF'; document.body.appendChild(p); setTimeout(function(){ document.body.removeChild(p); window.print(); },1200); })();">📄 Gerar PDF</button>
    <button class="btn btn-print" onclick="window.print()">🖨️ Imprimir</button>
    <button class="btn btn-close" onclick="window.close()">✕ Fechar</button>
  </div>

  <div class="page">
    <!-- Cabeçalho -->
    <div class="header">
      <div class="header-logo">Conexa — Sistema de Gestão Pedagógica</div>
      <div class="header-title">Diário da Turma</div>
      <div class="header-subtitle">${esc(dataFormatada)}</div>
    </div>

    <!-- Metadados -->
    <div class="meta-grid">
      <div class="meta-item">
        <span class="meta-label">Turma</span>
        <span class="meta-value">${esc(d.turmaNome)}</span>
      </div>
      ${d.unidadeNome ? `
      <div class="meta-item">
        <span class="meta-label">Unidade</span>
        <span class="meta-value">${esc(d.unidadeNome)}</span>
      </div>` : ''}
      <div class="meta-item">
        <span class="meta-label">Professor(a)</span>
        <span class="meta-value">${esc(d.professorNome)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Data</span>
        <span class="meta-value">${d.data.split('-').reverse().join('/')}</span>
      </div>
    </div>

    <!-- Conteúdo -->
    ${planejamentoHTML}
    ${execucaoHTML}
    ${avaliacaoHTML}
    ${presencaRotina}
    ${obsHTML}

    <!-- Rodapé -->
    <div class="footer">
      <span>Conexa V3 — Sistema de Gestão Pedagógica</span>
      <span>Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
    </div>
  </div>

  <script>window.focus();</script>
</body>
</html>`;
}

// ─── Funções de ação ──────────────────────────────────────────────────────────

/**
 * Abre o diário formatado em nova janela para impressão ou "Salvar como PDF".
 */
export function abrirDiarioImprimivel(data: DiaryPrintData): void {
  const html = buildDiaryPrintableHTML(data);
  const win = window.open('', '_blank', 'width=960,height=750,scrollbars=yes');
  if (!win) {
    alert('Permita pop-ups neste site para usar a impressão do diário.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
}
