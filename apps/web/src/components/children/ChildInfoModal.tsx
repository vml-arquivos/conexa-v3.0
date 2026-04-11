import { useEffect, useState } from 'react';
import { X, User, Heart, AlertTriangle, Phone, FileText, Baby } from 'lucide-react';
import http from '../../api/http';

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
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{valor}</p>
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
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Container responsivo: bottom sheet no mobile, dialog centralizado no desktop */}
      <div className="fixed inset-x-0 bottom-0 z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div
          className="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* ── HEADER com gradiente ── */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-t-2xl px-6 pt-8 pb-6 flex flex-col items-center gap-3 relative flex-shrink-0">
            {/* Botão fechar */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/70 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Foto ou iniciais */}
            {loading ? (
              <div className="w-20 h-20 rounded-full bg-white/20 ring-4 ring-white/50 flex items-center justify-center">
                <span className="text-white/60 text-xs">...</span>
              </div>
            ) : child?.photoUrl ? (
              <img
                src={child.photoUrl}
                alt={`${child?.firstName ?? ''} ${child?.lastName ?? ''}`}
                className="w-20 h-20 rounded-full object-cover ring-4 ring-white shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold ring-4 ring-white/50">
                {child?.firstName?.[0]}{child?.lastName?.[0]}
              </div>
            )}

            {/* Nome */}
            <p className="text-xl font-bold text-white text-center leading-tight">
              {loading ? 'Carregando...' : `${child?.firstName ?? ''} ${child?.lastName ?? ''}`.trim()}
            </p>

            {/* Código e inscrição */}
            {child?.codigoAluno && (
              <p className="text-sm text-white/70 text-center">
                Cód. {child.codigoAluno} · Insc. {child.inscricao ?? '—'}
              </p>
            )}
          </div>

          {/* ── CORPO ── */}
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm flex-1">Carregando ficha...</div>
          ) : (
            <div className="px-5 py-4 overflow-y-auto max-h-[60vh] space-y-5 flex-1">

              {/* Identificação */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Baby className="h-4 w-4 text-blue-500" />
                  <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Identificação</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Campo
                    label="Data de Nascimento"
                    valor={child?.dateOfBirth
                      ? `${new Date(child.dateOfBirth).toLocaleDateString('pt-BR')} (${calcularIdade(child.dateOfBirth)})`
                      : null}
                  />
                  <Campo label="Sexo" valor={nomeSexo} />
                  <Campo label="Tipagem Sanguínea" valor={child?.bloodType} />
                  <Campo label="Raça/Cor" valor={child?.raca} />
                </div>
              </div>

              {/* Família e Contatos */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-purple-500" />
                  <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Família e Contatos</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Campo label="Nome da Mãe" valor={child?.nomeMae} />
                  <Campo label="Nome do Pai" valor={child?.nomePai} />
                  <Campo label="Contato de Emergência" valor={child?.emergencyContactName} />
                  {child?.celPai && <Campo label="Telefone do Pai" valor={child.celPai} />}
                </div>
                {/* Telefone de emergência — destaque especial */}
                {child?.emergencyContactPhone && (
                  <div className="mt-3 flex items-center gap-2 bg-green-50 text-green-700 rounded-xl px-3 py-2 text-sm font-semibold">
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    {child.emergencyContactPhone}
                  </div>
                )}
              </div>

              {/* Laudos e Necessidades Especiais */}
              {(child?.laudado || child?.tipoLaudo || child?.descricaoLaudo || child?.medicamentos || child?.cid) && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4 text-amber-500" />
                    <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Laudos e Necessidades Especiais</p>
                    {child?.laudado && (
                      <span className="ml-auto text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-medium">
                        Laudado
                      </span>
                    )}
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
                    {child?.cid && (
                      <span className="inline-block bg-amber-100 text-amber-800 text-xs rounded px-2 py-0.5 font-medium">
                        CID: {child.cid}
                      </span>
                    )}
                    {child?.tipoLaudo && (
                      <p className="text-sm text-amber-800">{child.tipoLaudo}</p>
                    )}
                    {child?.descricaoLaudo && (
                      <p className="text-sm text-amber-800">{child.descricaoLaudo}</p>
                    )}
                    {child?.medicamentos && (
                      <p className="text-xs text-amber-600">Medicamentos: {child.medicamentos}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Alergias e Restrições Alimentares */}
              {(child?.allergies || restricoes.filter(r => r.isActive).length > 0) && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Alergias e Restrições Alimentares</p>
                  </div>
                  <div className="space-y-2">
                    {child?.allergies && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                        <p className="text-sm text-red-800 font-medium">{child.allergies}</p>
                      </div>
                    )}
                    {restricoes.filter(r => r.isActive).map((r: any) => (
                      <div key={r.id} className="bg-red-50 border border-red-200 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm text-red-800 font-medium">{r.name}</p>
                          {r.severity && (
                            <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                              r.severity === 'severa' ? 'bg-red-200 text-red-800' :
                              r.severity === 'moderada' ? 'bg-orange-100 text-orange-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>{r.severity}</span>
                          )}
                        </div>
                        {r.description && <p className="text-xs text-red-700 mt-0.5">{r.description}</p>}
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
                    <Heart className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Condições Médicas</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <p className="text-sm text-blue-800">{child.medicalConditions}</p>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ── RODAPÉ ── */}
          <div className="px-5 pb-5 pt-2 flex-shrink-0">
            <button
              onClick={onClose}
              className="w-full h-11 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
