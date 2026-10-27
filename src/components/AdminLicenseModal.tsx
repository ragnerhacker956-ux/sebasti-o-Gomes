import React, { useState, useEffect } from 'react';
import { useLicense } from '../context/LicenseContext';
import { PinItem, GeneratePinsParams } from '../types/license';
import {
  adminGeneratePins,
  adminListPins,
  adminPinAction,
  formatBase44Error,
} from '../services/base44Client';
import {
  ShieldAlert,
  Key,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Slash,
  AlertTriangle,
  X,
  Copy,
  Check,
  Calendar,
  Lock,
} from 'lucide-react';

export const AdminLicenseModal: React.FC = () => {
  const { isAdmin, isAdminModalOpen, setIsAdminModalOpen } = useLicense();

  const [pins, setPins] = useState<PinItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'generate'>('list');

  // Generator form
  const [count, setCount] = useState<number>(5);
  const [plan, setPlan] = useState<string>('PROFISSIONAL');
  const [durationDays, setDurationDays] = useState<number>(30);
  const [notes, setNotes] = useState<string>('');
  const [generatedPins, setGeneratedPins] = useState<PinItem[]>([]);
  const [copiedPin, setCopiedPin] = useState<string | null>(null);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Load PINs list from server
  const loadPins = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const res = await adminListPins();
      setPins(res.pins);
    } catch (err: any) {
      setError(formatBase44Error(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminModalOpen && isAdmin) {
      loadPins();
    }
  }, [isAdminModalOpen, isAdmin]);

  // Strict rule 10: Do not render or allow operations if not confirmed admin by server
  if (!isAdminModalOpen || !isAdmin) {
    return null;
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const params: GeneratePinsParams = {
        count: Number(count),
        plan,
        durationDays: Number(durationDays),
        notes: notes.trim(),
      };
      const res = await adminGeneratePins(params);
      setGeneratedPins(res.pins);
      setSuccess(`${res.pins.length} PIN(s) gerados com sucesso!`);
      loadPins();
    } catch (err: any) {
      setError(formatBase44Error(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (pinId: string, action: 'block' | 'unblock' | 'revoke') => {
    setActionLoading(pinId);
    setError(null);
    try {
      await adminPinAction(pinId, action);
      setSuccess(`Ação '${action}' concluída com sucesso.`);
      await loadPins();
    } catch (err: any) {
      setError(formatBase44Error(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopy = (pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopiedPin(pin);
    setTimeout(() => setCopiedPin(null), 2500);
  };

  const filteredPins = pins.filter((p) => {
    const matchesSearch =
      p.pin.toLowerCase().includes(search.toLowerCase()) ||
      (p.usedByEmail && p.usedByEmail.toLowerCase().includes(search.toLowerCase())) ||
      (p.notes && p.notes.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterStatus === 'ALL') return true;
    return p.status === filterStatus;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-4xl w-full text-white shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 border-b border-amber-500/30 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                Painel Administrativo de Licenças
                <span className="bg-amber-500/30 text-amber-300 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                  ADMIN AUTORIZADO
                </span>
              </h3>
              <p className="text-xs text-slate-400">Geração de PINs, auditoria e revogação de acessos</p>
            </div>
          </div>
          <button
            onClick={() => setIsAdminModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 justify-between items-center">
          <div className="flex">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
                activeTab === 'list'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Key size={14} /> PINs e Licenças Registadas ({pins.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('generate')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
                activeTab === 'generate'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plus size={14} /> Gerar Novos PINs
            </button>
          </div>
          <button
            type="button"
            onClick={loadPins}
            disabled={loading}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 py-1 px-2.5 rounded bg-slate-900 border border-slate-800"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Recarregar
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/70 border border-red-700/60 rounded-xl flex items-start gap-2.5 text-xs text-red-200">
              <AlertTriangle size={15} className="text-red-400 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-950/70 border border-emerald-700/60 rounded-xl flex items-start gap-2.5 text-xs text-emerald-200">
              <CheckCircle size={15} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>{success}</div>
            </div>
          )}

          {/* TAB 1: LIST PINS */}
          {activeTab === 'list' && (
            <div className="space-y-3">
              {/* Filter / Search Bar */}
              <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Pesquisar por PIN, e-mail ou nota..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Filter size={13} className="text-slate-400" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-200"
                  >
                    <option value="ALL">Todos os Estados</option>
                    <option value="AVAILABLE">Disponíveis</option>
                    <option value="USED">Em Uso / Ativados</option>
                    <option value="BLOCKED">Bloqueados</option>
                    <option value="REVOKED">Revogados</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 text-[11px]">
                      <th className="py-2.5 px-3">Código PIN</th>
                      <th className="py-2.5 px-3">Plano</th>
                      <th className="py-2.5 px-3">Validade</th>
                      <th className="py-2.5 px-3">Estado</th>
                      <th className="py-2.5 px-3">Utilizador</th>
                      <th className="py-2.5 px-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                    {filteredPins.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                          Nenhum PIN encontrado com os critérios selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredPins.map((p) => (
                        <tr key={p.id || p.pin} className="hover:bg-slate-900/50">
                          <td className="py-2 px-3 font-bold text-amber-300">
                            <div className="flex items-center gap-2">
                              <span>{p.pin}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(p.pin)}
                                className="text-slate-500 hover:text-white"
                                title="Copiar PIN"
                              >
                                {copiedPin === p.pin ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                              </button>
                            </div>
                          </td>
                          <td className="py-2 px-3 font-sans text-slate-300">{p.plan}</td>
                          <td className="py-2 px-3 text-slate-400">{p.durationDays} dias</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold ${
                                p.status === 'AVAILABLE'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : p.status === 'USED'
                                  ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                  : p.status === 'BLOCKED'
                                  ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                  : 'bg-red-950 text-red-400 border border-red-800'
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-sans text-slate-300 truncate max-w-[150px]">
                            {p.usedByEmail || '-'}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {p.status === 'BLOCKED' ? (
                                <button
                                  type="button"
                                  onClick={() => handleAction(p.id, 'unblock')}
                                  disabled={actionLoading === p.id}
                                  className="px-2 py-0.5 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 text-[10px] rounded"
                                >
                                  Desbloquear
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAction(p.id, 'block')}
                                  disabled={actionLoading === p.id || p.status === 'REVOKED'}
                                  className="px-2 py-0.5 bg-amber-900/60 hover:bg-amber-800 text-amber-300 text-[10px] rounded disabled:opacity-30"
                                >
                                  Bloquear
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleAction(p.id, 'revoke')}
                                disabled={actionLoading === p.id || p.status === 'REVOKED'}
                                className="px-2 py-0.5 bg-red-900/60 hover:bg-red-800 text-red-300 text-[10px] rounded disabled:opacity-30"
                              >
                                Revogar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: GENERATE PINS */}
          {activeTab === 'generate' && (
            <div className="space-y-4">
              <form onSubmit={handleGenerate} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Quantidade de PINs:</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Plano de Licença:</label>
                  <select
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="PROFISSIONAL">PROFISSIONAL</option>
                    <option value="MENSAL">MENSAL</option>
                    <option value="TRIMESTRAL">TRIMESTRAL</option>
                    <option value="ANUAL">ANUAL</option>
                    <option value="VITALICIO">VITALÍCIO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Validade (dias):</label>
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    value={durationDays}
                    onChange={(e) => setDurationDays(parseInt(e.target.value) || 30)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Notas / Observações:</label>
                  <input
                    type="text"
                    placeholder="ex: Lote vendido cliente X"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div className="sm:col-span-2 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Plus size={15} />
                    {loading ? 'Gerando no backend...' : 'Gerar PINs no Servidor Base44'}
                  </button>
                </div>
              </form>

              {/* Generated list preview */}
              {generatedPins.length > 0 && (
                <div className="mt-4 p-4 bg-slate-950 border border-amber-500/40 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-amber-300 flex items-center justify-between">
                    <span>PINs Gerados Recentemente ({generatedPins.length}):</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(generatedPins.map((p) => p.pin).join('\n'))}
                      className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-sans font-normal"
                    >
                      <Copy size={12} /> Copiar Todos
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 font-mono text-xs">
                    {generatedPins.map((p, i) => (
                      <div
                        key={i}
                        className="p-1.5 bg-slate-900 border border-slate-800 rounded flex items-center justify-between"
                      >
                        <span className="text-white font-bold">{p.pin}</span>
                        <span className="text-slate-400 text-[10px]">
                          {p.plan} • {p.durationDays}d
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
