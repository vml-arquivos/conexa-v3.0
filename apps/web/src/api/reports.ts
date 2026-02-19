import http from './http';

export interface ReportData {
  [key: string]: unknown;
}

export async function getDiaryByClassroom(classroomId: string, startDate: string, endDate: string): Promise<ReportData[]> {
  const response = await http.get('/reports/diary/by-classroom', { params: { classroomId, startDate, endDate } });
  return response.data;
}

export async function getDiaryByPeriod(startDate: string, endDate: string): Promise<ReportData[]> {
  const response = await http.get('/reports/diary/by-period', { params: { startDate, endDate } });
  return response.data;
}

export async function getDiaryUnplanned(): Promise<ReportData[]> {
  const response = await http.get('/reports/diary/unplanned');
  return response.data;
}

// Sprint 6 Fix: Dashboards corretos de unidade e professor

/**
 * Dashboard da Unidade - KPIs operacionais e pedagógicos
 */
export interface UnitDashboardData {
  unitId: string;
  period: {
    from: string;
    to: string;
  };
  kpis: {
    diaryCreatedTotal: number;
    unplannedCount: number;
    planningsDraftOrPending: number;
    classroomsCount: number;
    activeChildrenCount: number;
  };
}

export async function getUnitDashboard(params: {
  unitId?: string;
  from?: string;
  to?: string;
}): Promise<UnitDashboardData> {
  const response = await http.get('/reports/dashboard/unit', { params });
  return response.data;
}

/**
 * Dashboard do Professor - KPIs por turma no dia
 */
export interface TeacherDashboardData {
  date: string;
  classrooms: Array<{
    classroomId: string;
    classroomName: string;
    totalDiaryEvents: number;
    unplannedEvents: number;
    microGesturesFilled: number;
    activePlanningStatus: string | null;
  }>;
}

export async function getTeacherDashboard(params: {
  date?: string;
  classroomId?: string;
}): Promise<TeacherDashboardData> {
  const response = await http.get('/reports/dashboard/teacher', { params });
  return response.data;
}
