import { useState, useEffect } from 'react';
import { getDiaryEvents, createDiaryEvent } from '../api/diary';
import type { DiaryEvent, CreateDiaryEventDto } from '../api/diary';
import { getErrorMessage } from '../utils/errorMessage';

export function DiaryPage() {
  const [events, setEvents] = useState<DiaryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', date: '', description: '' });
  const [formError, setFormError] = useState('');
  const [formErrorDetails, setFormErrorDetails] = useState<string[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [jsonPayload, setJsonPayload] = useState('');

  const loadEvents = () => {
    setLoading(true);
    getDiaryEvents()
      .then((data) => {
        setEvents(data || []);
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Erro ao carregar eventos');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormErrorDetails([]);
    setFormLoading(true);

    try {
      let payload: unknown;
      
      if (advancedMode) {
        // Modo avançado: enviar JSON exatamente como o usuário escreveu
        try {
          payload = JSON.parse(jsonPayload);
        } catch {
          setFormError('JSON inválido. Verifique a sintaxe.');
          setFormLoading(false);
          return;
        }
      } else {
        // Modo normal: usar formData
        payload = formData;
      }

      await createDiaryEvent(payload as unknown as CreateDiaryEventDto);
      
      // Sucesso: resetar formulário
      setFormData({ title: '', date: '', description: '' });
      setJsonPayload('');
      setAdvancedMode(false);
      setShowForm(false);
      loadEvents();
    } catch (err: unknown) {
      // Exibir erro 400 na tela com clareza
      const e = err as { response?: { status?: number; data?: { message?: unknown } } };
      const status = e.response?.status;
      const errorData = e.response?.data;
      
      if (status === 400) {
        // Erro de validação do backend
        let errorMessage = 'O backend rejeitou o payload.';
        let errorDetails: string[] = [];

        if (errorData?.message) {
          if (Array.isArray(errorData.message)) {
            // message é array de strings (ex: class-validator)
            errorDetails = errorData.message;
            errorMessage = 'O backend rejeitou o payload. Ajuste os campos conforme as mensagens abaixo:';
          } else if (typeof errorData.message === 'string') {
            // message é string única
            errorMessage = errorData.message;
          }
        }

        setFormError(errorMessage);
        setFormErrorDetails(errorDetails);
      } else {
        // Outro erro
        const errorMessage = typeof errorData?.message === 'string' ? errorData.message : getErrorMessage(err, 'Erro ao criar evento');
        setFormError(`Erro ${status || ''}: ${errorMessage}`);
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleAdvancedMode = () => {
    if (!advancedMode) {
      // Entrar no modo avançado: pré-preencher JSON
      setJsonPayload(JSON.stringify(formData, null, 2));
    }
    setAdvancedMode(!advancedMode);
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Diário</h1>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setAdvancedMode(false);
            setFormError('');
            setFormErrorDetails([]);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          {showForm ? 'Cancelar' : 'Criar Evento'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-6 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Novo Evento</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {!advancedMode ? (
              // Modo Normal: Formulário
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            ) : (
              // Modo Avançado: JSON
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payload JSON (Modo Avançado)
                </label>
                <textarea
                  value={jsonPayload}
                  onChange={(e) => setJsonPayload(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder='{"title": "Exemplo", "date": "2026-02-06", "description": "..."}'
                />
                <p className="mt-1 text-xs text-gray-500">
                  Edite o JSON diretamente. Será enviado exatamente como escrito.
                </p>
              </div>
            )}

            {formError && (
              <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                <p className="font-semibold mb-2">{formError}</p>
                {formErrorDetails.length > 0 && (
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {formErrorDetails.map((detail, index) => (
                      <li key={index}>{detail}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={formLoading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors"
              >
                {formLoading ? 'Enviando...' : 'Criar'}
              </button>
              
              {formError && !advancedMode && (
                <button
                  type="button"
                  onClick={handleAdvancedMode}
                  className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                >
                  Modo Avançado (JSON)
                </button>
              )}
              
              {advancedMode && (
                <button
                  type="button"
                  onClick={handleAdvancedMode}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  Voltar ao Formulário
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {events.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
          Nenhum evento encontrado
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Título
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descrição
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {event.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {event.eventDate}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {event.description || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
