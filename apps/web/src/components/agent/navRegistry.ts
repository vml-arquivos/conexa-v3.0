/**
 * navRegistry — registro leve dos destinos que a Sidebar REALMENTE exibe.
 *
 * A Sidebar já decide, por perfil (professor, coordenação, diretor, secretaria…),
 * quais itens cada pessoa pode ver. Em vez de duplicar essa regra, a Sidebar
 * publica aqui o que renderiza; o Assistente e a Paleta de Comandos leem
 * daqui. Resultado: eles nunca oferecem uma rota que o menu não ofereceria.
 */
import type { ReactNode } from 'react';

export interface NavDestination {
  path: string;
  label: string;
  section: string;
  icon?: ReactNode;
}

let sections = new Map<string, NavDestination[]>();
let snapshot: NavDestination[] = [];
const listeners = new Set<() => void>();

function rebuild() {
  snapshot = Array.from(sections.values()).flat();
  listeners.forEach((l) => l());
}

export function publishNav(key: string, items: NavDestination[]) {
  sections = new Map(sections).set(key, items);
  rebuild();
}

export function unpublishNav(key: string) {
  if (!sections.has(key)) return;
  const next = new Map(sections);
  next.delete(key);
  sections = next;
  rebuild();
}

export function subscribeNav(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getNavSnapshot() {
  return snapshot;
}
