import http from './http';

export type IntelligencePeriodParams = {
  startDate?: string;
  endDate?: string;
  unitId?: string;
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

export async function getUnitIntelligenceOverview(params: IntelligencePeriodParams = {}) {
  const response = await http.get('/intelligence-core/unit/overview', { params });
  return response.data;
}

export async function getNetworkIntelligenceOverview(params: IntelligencePeriodParams = {}) {
  const response = await http.get('/intelligence-core/network/overview', { params });
  return response.data;
}

export async function getPsychologyIntelligenceOverview(params: IntelligencePeriodParams = {}) {
  const response = await http.get('/intelligence-core/psychology/overview', { params });
  return response.data;
}
