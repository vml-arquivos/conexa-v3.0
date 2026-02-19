import { useEffect, useState } from 'react';
import { getCurriculumMatrices } from '../api/matrices';
import type { CurriculumMatrix } from '../api/matrices';

export function MatricesPage() {
  const [matrices, setMatrices] = useState<CurriculumMatrix[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getCurriculumMatrices()
      .then((data) => {
        setMatrices(data || []);
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Erro ao carregar matrizes');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        {error}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Matrizes Curriculares</h1>
      {matrices.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
          Nenhuma matriz encontrada
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descrição
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {matrices.map((matrix) => (
                <tr key={matrix.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {matrix.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {matrix.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {matrix.description || '-'}
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
