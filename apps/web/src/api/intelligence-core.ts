import http from './http';

export type IntelligencePeriodParams = {
  startDate?: string;
  endDate?: string;
};

export async function getIntegralChildProfile(childId: string, params: IntelligencePeriodParams = {}) {
  const response = await http.get(`/intelligence-core/child/${childId}/integral-profile`, { params });
  return response.data;
}

export async function getRdicDraftContext(childId: string, params: IntelligencePeriodParams = {}) {
  const response = await http.get(`/intelligence-core/child/${childId}/rdic-draft-context`, { params });
  return response.data;
}

export async function getClassroomIntelligenceOverview(classroomId: string, params: IntelligencePeriodParams = {}) {
  const response = await http.get(`/intelligence-core/classroom/${classroomId}/overview`, { params });
  return response.data;
}
