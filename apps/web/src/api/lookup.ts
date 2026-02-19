import http from './http';
import type {
  AccessibleUnit,
  AccessibleClassroom,
  AccessibleTeacher,
  PlanningTemplateCocris,
} from '../types/lookup';

/**
 * Busca unidades acessíveis ao usuário logado
 * RBAC: filtra automaticamente por role no backend
 */
export async function getAccessibleUnits(): Promise<AccessibleUnit[]> {
  const response = await http.get('/lookup/units/accessible');
  return response.data;
}

/**
 * Busca turmas acessíveis ao usuário logado
 * @param unitId - Filtrar por unidade (opcional)
 */
export async function getAccessibleClassrooms(
  unitId?: string
): Promise<AccessibleClassroom[]> {
  const response = await http.get('/lookup/classrooms/accessible', {
    params: unitId ? { unitId } : undefined,
  });
  return response.data;
}

/**
 * Busca professoras acessíveis ao usuário logado
 * @param unitId - Filtrar por unidade (opcional)
 */
export async function getAccessibleTeachers(
  unitId?: string
): Promise<AccessibleTeacher[]> {
  const response = await http.get('/lookup/teachers/accessible', {
    params: unitId ? { unitId } : undefined,
  });
  return response.data;
}

/**
 * Busca templates padrão COCRIS
 */
export async function getPlanningTemplatesCocris(): Promise<
  PlanningTemplateCocris[]
> {
  const response = await http.get('/planning-templates/cocris-defaults');
  return response.data;
}
