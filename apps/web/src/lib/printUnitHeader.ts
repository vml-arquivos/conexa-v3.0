/**
 * printUnitHeader — helper para cabeçalho de impressão com identidade de unidade.
 *
 * Regras:
 * - Marca global COCRIS Pedagógico sempre visível.
 * - Nome da unidade exibido quando fornecido.
 * - Logo da unidade exibido apenas quando unit.id === "unit-arara-caninde"
 *   ou unit.name contém "Arara Canindé".
 * - Fallback: se não houver logo da unidade, exibe apenas o nome.
 * - Login/sidebar continuam usando apenas o logo COCRIS global (não alterados aqui).
 */

export interface PrintUnitInfo {
  id?: string | null;
  name?: string | null;
}

/** Retorna true se a unidade é CEPI Arara Canindé */
function isAraraCaninde(unit: PrintUnitInfo): boolean {
  if (!unit) return false;
  if (unit.id === 'unit-arara-caninde') return true;
  if (unit.name && unit.name.toLowerCase().includes('arara cani')) return true;
  return false;
}

/**
 * Gera o bloco HTML do cabeçalho de impressão.
 *
 * @param unit  Dados da unidade do usuário autenticado (user.unit)
 * @param origin  window.location.origin da janela principal (para URL absoluta do logo)
 */
export function buildPrintHeader(unit?: PrintUnitInfo | null, origin?: string): string {
  const base = origin ?? '';

  // ── Linha da marca global ──
  const globalBrand = `<div class="header-logo">COCRIS Pedagógico — Sistema de Gestão Pedagógica</div>`;

  if (!unit?.name) {
    // Sem contexto de unidade: apenas marca global
    return globalBrand;
  }

  // ── Logo da unidade (somente Arara Canindé) ──
  let unitLogoHTML = '';
  if (isAraraCaninde(unit)) {
    const logoUrl = `${base}/branding/cocris/units/arara-caninde.png`;
    unitLogoHTML = `<img
      src="${logoUrl}"
      alt="Logo CEPI Arara Canindé"
      style="height:40px;width:auto;object-fit:contain;display:block;margin-bottom:4px;"
      onerror="this.style.display='none'"
    />`;
  }

  // ── Nome da unidade ──
  const unitNameHTML = `<div class="header-unit">${unit.name}</div>`;

  return `${globalBrand}${unitLogoHTML}${unitNameHTML}`;
}

/**
 * CSS adicional para o cabeçalho de unidade.
 * Deve ser incluído no bloco <style> do documento imprimível.
 */
export const PRINT_UNIT_HEADER_CSS = `
  .header-unit {
    font-size: 10pt;
    font-weight: 700;
    color: #1e1b4b;
    margin-top: 4px;
    letter-spacing: 0.3px;
  }
`;
