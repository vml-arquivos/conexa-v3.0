import { useEffect, useState } from 'react';
import { X, User, Heart, AlertTriangle, Phone, FileText, Baby } from 'lucide-react';
import http from '../../api/http';
import { ChildAvatar } from './ChildAvatar';

interface ChildInfoModalProps {
  childId: string;
  onClose: () => void;
}

function calcularIdade(dob: string): string {
  if (!dob) return '—';
  const hoje = new Date();
  const nasc = new Date(dob);
  const meses = (hoje.getFullYear() - nasc.getFullYear()) * 12 + (hoje.getMonth() - nasc.getMonth());
  if (meses < 12) return `${meses} meses`;
  const anos = Math.floor(meses / 12);
  const m = meses % 12;
  return m > 0 ? `${anos} anos e ${m} meses` : `${anos} anos`;
}

function Campo({ label, valor }: { label: string; valor?: string | null }) {
  if (!valor) return null;
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-slate-800 mt-0.5">{valor}</p>
    </div>
  );
}

export function ChildInfoModal({ childId, onClose }: ChildInfoModalProps) {
  const [child, setChild] = useState<any>(null);
  const [restricoes, setRestricoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [childRes, restricoesRes] = await Promise.all([
          http.get(`/children/${childId}`),
          http.get(`/children/${childId}/dietary-restrictions`),
        ]);
        setChild(childRes.data);
        setRestricoes(Array.isArray(restricoesRes.data) ? restricoesRes.data : []);
      } catch { /* silencioso */ }
      finally { setLoading(false); }
    }
    load();
  }, [childId]);

  const nomeSexo = child?.gender === 'MASCULINO' ? 'Masculino' : child?.gender === 'FEMININO' ? 'Feminino' : 'Não informado';

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <ChildAvatar child={child} sizeClassName="w-12 h-12"
              imageClassName="rounded-xl object-cover"
              fallbackClassName="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center"
              iconClassName="w-7 h-7 text-slate-400" showInitials />
            <div>
              <p className="font-semibold text-slate-900">
                {loading ? 'Carregando...' : `${child?.firstName ?? ''} ${child?.lastName ?? ''}`.trim()}
              </p>
              {child?.codigoAluno && (
                <p className="text-xs text-slate-500">Cód. {child.codigoAluno} · Insc. {child.inscricao ?? '—'}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Carregando ficha...</div>
        ) : (
          <div className="p-5 space-y-5">

            {/* Identificação */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Baby className="h-4 w-4 text-blue-600" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Identificação</p>
              </div>
              <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-4">
                <Campo label="Data de Nascimento"
                  valor={child?.dateOfBirth
                    ? `${new Date(child.dateOfBirth).toLocaleDateString('pt-BR')} (${calcularIdade(child.dateOfBirth)})`
                    : null} />
                <Campo label="Sexo" valor={nomeSexo} />
                <Campo label="Tipagem Sanguínea" valor={child?.bloodType} />
                <Campo label="Raça/Cor" valor={child?.raca} />
              </div>
            </div>

            {/* Pais / Responsáveis */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
                  <User className="h-4 w-4 text-purple-600" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Família e Contatos</p>
              </div>
              <div className="grid grid-cols-1 gap-3 bg-slate-50 rounded-xl p-4">
                <Campo label="Nome da Mãe" valor={child?.nomeMae} />
                <Campo label="Nome do Pai" valor={child?.nomePai} />
                <Campo label="Contato de Emergência" valor={child?.emergencyContactName} />
                <Campo label="Telefone de Emergência" valor={child?.emergencyContactPhone} />
                {child?.celPai && <Campo label="Telefone do Pai" valor={child.celPai} />}
              </div>
            </div>

            {/* Saúde e Laudos */}
            {(child?.laudado || child?.tipoLaudo || child?.descricaoLaudo || child?.medicamentos || child?.cid) && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-amber-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Laudos e Necessidades Especiais</p>
                  {child?.laudado && (
                    <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                      Laudado
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 bg-amber-50 rounded-xl p-4 border border-amber-100">
                  <Campo label="Tipo de Laudo" valor={child?.tipoLaudo} />
                  <Campo label="CID" valor={child?.cid} />
                  {child?.descricaoLaudo && (
                    <div className="col-span-2">
                      <Campo label="Descrição" valor={child.descricaoLaudo} />
                    </div>
                  )}
                  {child?.medicamentos && (
                    <div className="col-span-2">
                      <Campo label="Medicamentos em Uso na Escola" valor={child.medicamentos} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Alergias e Restrições */}
            {(child?.allergies || restricoes.length > 0) && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Alergias e Restrições Alimentares</p>
                </div>
                <div className="space-y-2">
                  {child?.allergies && (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                      <p className="text-xs font-medium text-red-600 uppercase tracking-wide mb-1">Alergias</p>
                      <p className="text-sm text-red-800">{child.allergies}</p>
                    </div>
                  )}
                  {restricoes.filter(r => r.isActive).map((r: any) => (
                    <div key={r.id} className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-orange-700 uppercase tracking-wide">{r.type}</p>
                        {r.severity && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            r.severity === 'severa' ? 'bg-red-100 text-red-700' :
                            r.severity === 'moderada' ? 'bg-orange-100 text-orange-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>{r.severity}</span>
                        )}
                      </div>
                      <p className="text-sm text-orange-900 font-medium">{r.name}</p>
                      {r.description && <p className="text-xs text-orange-700 mt-0.5">{r.description}</p>}
                      {r.forbiddenFoods && (
                        <p className="text-xs text-red-700 mt-1">🚫 {r.forbiddenFoods}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Condições Médicas */}
            {child?.medicalConditions && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                    <Heart className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Condições Médicas</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                  <p className="text-sm text-green-900">{child.medicalConditions}</p>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
