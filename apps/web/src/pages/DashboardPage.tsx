import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../app/AuthProvider';
import { normalizeRoles } from '../app/RoleProtectedRoute';
import {
  getUnitDashboard,
  getTeacherDashboard,
  type UnitDashboardData,
  type TeacherDashboardData,
} from '../api/reports';
import { getPlanningTemplatesCocris } from '../api/lookup';
import type { PlanningTemplateCocris } from '../types/lookup';
import { UnitSelect } from '../components/select/UnitSelect';
import { ClassroomSelect } from '../components/select/ClassroomSelect';

export function DashboardPage() {
  const { user } = useAuth();
  const userRoles = normalizeRoles(user);

  // Estado do Dashboard da Unidade
  const [unitData, setUnitData] = useState<UnitDashboardData | null>(null);
  const [unitLoading, setUnitLoading] = useState(false);
  const [unitError, setUnitError] = useState<string | null>(null);
  const [unitId, setUnitId] = useState('');
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Estado do Dashboard do Professor
  const [teacherData, setTeacherData] = useState<TeacherDashboardData | null>(null);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teacherError, setTeacherError] = useState<string | null>(null);
  const [teacherDate, setTeacherDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [classroomId, setClassroomId] = useState('');

  // Templates
  const [templates, setTemplates] = useState<PlanningTemplateCocris[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  // Debug toggle
  const [showDebug, setShowDebug] = useState(false);

  // Verificar roles
  const isStaffCentral = userRoles.some((role) => role.startsWith('STAFF_CENTRAL'));
  const isUnitLevel = userRoles.some((role) => role.startsWith('UNIDADE'));
  const isGlobalLevel = userRoles.some((role) =>
    ['MANTENEDORA', 'DEVELOPER'].includes(role)
  );
  const canViewUnitDashboard = userRoles.some((role) =>
    role.startsWith('UNIDADE') || role.startsWith('STAFF_CENTRAL') || ['MANTENEDORA', 'DEVELOPER'].includes(role)
  );
  const canViewTeacherDashboard = userRoles.some((role) =>
    role.startsWith('PROFESSOR') || role.startsWith('UNIDADE') || role.startsWith('STAFF_CENTRAL') || ['MANTENEDORA', 'DEVELOPER'].includes(role)
  );
  const isProfessor = userRoles.some((role) => role.startsWith('PROFESSOR'));
  const isDeveloper = userRoles.includes('DEVELOPER');

  // Carregar templates
  useEffect(() => {
    let cancelled = false;
    setTemplatesLoading(true);
    getPlanningTemplatesCocris()
      .then((data) => {
        if (!cancelled) setTemplates(data);
      })
      .catch(() => {
        // Silenciar erro de templates (não é crítico)
      })
      .finally(() => {
        if (!cancelled) setTemplatesLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Handler: Carregar Dashboard da Unidade
  const handleLoadUnitDashboard = useCallback(async () => {
    try {
      setUnitLoading(true);
      setUnitError(null);

      const params: Record<string, string> = {
        from: fromDate,
        to: toDate,
      };

      // Roles globais e STAFF_CENTRAL precisam de unitId selecionado
      if (isGlobalLevel || isStaffCentral) {
        if (!unitId) {
          setUnitError('Selecione uma unidade para visualizar o painel.');
          setUnitLoading(false);
          return;
        }
        params.unitId = unitId;
      }
      // Roles de unidade (UNIDADE_*): unitId vem do token (backend resolve)

      const data = await getUnitDashboard(params);
      setUnitData(data);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setUnitError(error.response?.data?.message || 'Erro ao carregar dashboard da unidade');
    } finally {
      setUnitLoading(false);
    }
  }, [fromDate, toDate, unitId, isGlobalLevel]);

  // Handler: Carregar Dashboard do Professor
  const handleLoadTeacherDashboard = useCallback(async () => {
    try {
      setTeacherLoading(true);
      setTeacherError(null);

      const params: Record<string, string> = {
        date: teacherDate,
      };

      // Roles não-professor precisam de classroomId
      if (!isProfessor) {
        if (!classroomId) {
          setTeacherError('Selecione uma turma para visualizar os KPIs.');
          setTeacherLoading(false);
          return;
        }
        params.classroomId = classroomId;
      } else if (classroomId) {
        params.classroomId = classroomId;
      }

      const data = await getTeacherDashboard(params);
      setTeacherData(data);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setTeacherError(error.response?.data?.message || 'Erro ao carregar dashboard do professor');
    } finally {
      setTeacherLoading(false);
    }
  }, [teacherDate, classroomId, isProfessor]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard - Hub de Gestão</h1>

      {/* Informações do Usuário */}
      <div className="bg-white p-4 rounded-lg shadow">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Email:</span> {user?.email}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-medium">Perfil:</span> {userRoles.join(', ')}
        </p>
      </div>

      {/* ========== Dashboard da Unidade ========== */}
      {canViewUnitDashboard && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4 text-blue-700">
            Painel da Unidade
          </h2>

          {/* Formulário com Selects */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Select de Unidade: STAFF_CENTRAL e GLOBAL podem selecionar */}
            {(isGlobalLevel || isStaffCentral) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidade *
                </label>
                <UnitSelect
                  value={unitId}
                  onChange={setUnitId}
                />
              </div>
            )}
            {/* Roles de unidade: mostrar unidade fixa (desabilitado) */}
            {isUnitLevel && !isStaffCentral && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidade
                </label>
                <UnitSelect
                  value={unitId}
                  onChange={setUnitId}
                  disabled
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                De
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Até
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleLoadUnitDashboard}
                disabled={unitLoading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium"
              >
                {unitLoading ? 'Carregando...' : 'Carregar Painel'}
              </button>
            </div>
          </div>

          {/* Erro */}
          {unitError && (
            <div className="bg-red-50 border border-red-300 text-red-800 p-3 rounded-md mb-4 text-sm">
              {unitError}
            </div>
          )}

          {/* KPIs */}
          {unitData && (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Período: {unitData.period.from} até {unitData.period.to}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-600">Eventos Criados</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {unitData.kpis.diaryCreatedTotal}
                  </p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <p className="text-sm text-gray-600">Não Planejados</p>
                  <p className="text-2xl font-bold text-yellow-700">
                    {unitData.kpis.unplannedCount}
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <p className="text-sm text-gray-600">Planejamentos Pendentes</p>
                  <p className="text-2xl font-bold text-orange-700">
                    {unitData.kpis.planningsDraftOrPending}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600">Turmas Ativas</p>
                  <p className="text-2xl font-bold text-green-700">
                    {unitData.kpis.classroomsCount}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-sm text-gray-600">Crianças Ativas</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {unitData.kpis.activeChildrenCount}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Empty state: sem dados ainda */}
          {!unitData && !unitLoading && !unitError && (
            <div className="text-center py-8 text-gray-400">
              <p className="text-lg">Selecione o período e clique em &quot;Carregar Painel&quot;</p>
              <p className="text-sm mt-1">Os KPIs da unidade serão exibidos aqui.</p>
            </div>
          )}
        </div>
      )}

      {/* ========== Dashboard do Professor ========== */}
      {canViewTeacherDashboard && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4 text-green-700">
            Dashboard do Professor (KPIs do dia)
          </h2>

          {/* Formulário com Selects */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Select de Unidade: só para roles globais */}
            {isGlobalLevel && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidade *
                </label>
                <UnitSelect
                  value={unitId}
                  onChange={(id) => {
                    setUnitId(id);
                    setClassroomId(''); // Reset turma ao mudar unidade
                  }}
                />
              </div>
            )}

            {/* Select de Turma */}
            {!isProfessor && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Turma {!isProfessor && '*'}
                </label>
                <ClassroomSelect
                  unitId={unitId || undefined}
                  value={classroomId}
                  onChange={setClassroomId}
                />
              </div>
            )}

            {/* Professor: select de turma (suas turmas) */}
            {isProfessor && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Turma (opcional)
                </label>
                <ClassroomSelect
                  value={classroomId}
                  onChange={setClassroomId}
                  autoSelectSingle
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data
              </label>
              <input
                type="date"
                value={teacherDate}
                onChange={(e) => setTeacherDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleLoadTeacherDashboard}
                disabled={teacherLoading}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 text-sm font-medium"
              >
                {teacherLoading ? 'Carregando...' : 'Carregar KPIs'}
              </button>
            </div>
          </div>

          {/* Erro */}
          {teacherError && (
            <div className="bg-red-50 border border-red-300 text-red-800 p-3 rounded-md mb-4 text-sm">
              {teacherError}
            </div>
          )}

          {/* KPIs por Turma */}
          {teacherData && (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Data: {teacherData.date}
              </p>
              {teacherData.classrooms.length === 0 && (
                <div className="text-center py-6 text-gray-400">
                  <p className="text-lg">Nenhuma turma com dados nesta data</p>
                  <p className="text-sm mt-1">Verifique se há eventos registrados ou tente outra data.</p>
                </div>
              )}
              <div className="space-y-4">
                {teacherData.classrooms.map((classroom) => (
                  <div
                    key={classroom.classroomId}
                    className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                  >
                    <h3 className="font-semibold text-lg mb-3">
                      {classroom.classroomName}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <p className="text-xs text-gray-600">Total Eventos</p>
                        <p className="text-xl font-bold">{classroom.totalDiaryEvents}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Não Planejados</p>
                        <p className="text-xl font-bold text-yellow-600">
                          {classroom.unplannedEvents}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Microgestos</p>
                        <p className="text-xl font-bold text-blue-600">
                          {classroom.microGesturesFilled}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Status Planejamento</p>
                        <p className="text-sm font-semibold text-green-600">
                          {classroom.activePlanningStatus || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!teacherData && !teacherLoading && !teacherError && (
            <div className="text-center py-8 text-gray-400">
              <p className="text-lg">
                {isProfessor
                  ? 'Clique em "Carregar KPIs" para ver os dados do dia'
                  : 'Selecione uma unidade e turma, depois clique em "Carregar KPIs"'}
              </p>
              <p className="text-sm mt-1">Os KPIs por turma serão exibidos aqui.</p>
            </div>
          )}
        </div>
      )}

      {/* ========== Templates de Planejamento ========== */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-semibold mb-4 text-indigo-700">
          Templates de Planejamento
        </h2>

        {templatesLoading && (
          <div className="text-center py-6 text-gray-400">
            <p>Carregando templates...</p>
          </div>
        )}

        {!templatesLoading && templates.length === 0 && (
          <div className="text-center py-6 text-gray-400">
            <p className="text-lg">Nenhum template disponível</p>
            <p className="text-sm mt-1">Templates de planejamento serão exibidos aqui quando configurados.</p>
          </div>
        )}

        {!templatesLoading && templates.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="border border-indigo-200 rounded-lg p-4 hover:border-indigo-400 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-indigo-800">{template.name}</h3>
                  <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded uppercase">
                    {template.type}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{template.description}</p>

                <button
                  onClick={() =>
                    setExpandedTemplate(
                      expandedTemplate === template.id ? null : template.id
                    )
                  }
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {expandedTemplate === template.id ? 'Fechar modelo' : 'Ver modelo'}
                </button>

                {/* Seções expandidas */}
                {expandedTemplate === template.id && (
                  <div className="mt-3 pt-3 border-t border-indigo-100 space-y-2">
                    {template.sections.map((section, idx) => (
                      <div key={idx} className="bg-indigo-50 p-2 rounded text-sm">
                        <p className="font-medium text-indigo-700">{section.title}</p>
                        <p className="text-gray-500 text-xs mt-1">
                          Campos: {section.fields?.join(', ') || 'N/A'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Debug JSON (apenas para DEVELOPER) */}
      {isDeveloper && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="text-sm text-gray-700 font-medium hover:text-gray-900"
          >
            {showDebug ? '\u25BC' : '\u25B6'} Show Debug JSON
          </button>
          {showDebug && (
            <div className="mt-2 space-y-2">
              {unitData && (
                <details className="bg-white p-3 rounded border">
                  <summary className="cursor-pointer font-medium">Unit Dashboard Data</summary>
                  <pre className="mt-2 text-xs overflow-auto">
                    {JSON.stringify(unitData, null, 2)}
                  </pre>
                </details>
              )}
              {teacherData && (
                <details className="bg-white p-3 rounded border">
                  <summary className="cursor-pointer font-medium">Teacher Dashboard Data</summary>
                  <pre className="mt-2 text-xs overflow-auto">
                    {JSON.stringify(teacherData, null, 2)}
                  </pre>
                </details>
              )}
              {templates.length > 0 && (
                <details className="bg-white p-3 rounded border">
                  <summary className="cursor-pointer font-medium">Templates Data</summary>
                  <pre className="mt-2 text-xs overflow-auto">
                    {JSON.stringify(templates, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
