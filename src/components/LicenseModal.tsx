import React, { useState } from 'react';
import { useLicense, DIOGIS_WHATSAPP_NUMBER, DIOGIS_WHATSAPP_LINK } from '../context/LicenseContext';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Key,
  Clock,
  Calendar,
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  X,
  Settings,
  Sparkles,
  Lock,
} from 'lucide-react';

export const LicenseModal: React.FC = () => {
  const {
    appId,
    setAppId,
    user,
    license,
    licenseLoading,
    error,
    clearError,
    isLicenseActive,
    refreshLicense,
    activatePin,
    isLicenseModalOpen,
    setIsLicenseModalOpen,
    activeLicenseTab,
    setActiveLicenseTab,
    setIsAuthModalOpen,
  } = useLicense();

  const [pinInput, setPinInput] = useState('');
  const [pinSubmitting, setPinSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [tempAppId, setTempAppId] = useState(appId);

  if (!isLicenseModalOpen) return null;

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;

    if (!user) {
      clearError();
      setIsLicenseModalOpen(false);
      setIsAuthModalOpen(true);
      return;
    }

    clearError();
    setSuccessMessage(null);
    setPinSubmitting(true);
    try {
      await activatePin(pinInput);
      setSuccessMessage('PIN ativado com sucesso! A sua licença está agora ativa.');
      setPinInput('');
      setActiveLicenseTab('status');
    } catch (err: any) {
      // Error is set in context
    } finally {
      setPinSubmitting(false);
    }
  };

  const handleSaveAppId = (e: React.FormEvent) => {
    e.preventDefault();
    setAppId(tempAppId);
    setShowConfig(false);
    refreshLicense();
  };

  const formatLicenseDate = (val?: string | number | null): string => {
    if (!val) return '-';
    if (typeof val === 'string' && val.includes('/') && val.length <= 10) {
      return val;
    }
    try {
      let num = typeof val === 'number' ? val : Number(val);
      if (!isNaN(num) && num > 0) {
        if (num < 10000000000) {
          num = num * 1000;
        }
        const d = new Date(num);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
      }
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
    } catch {}
    return String(val);
  };

  const getStatusBadge = () => {
    if (license?.active || license?.state === 'ACTIVE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
          <ShieldCheck size={14} /> Ativa
        </span>
      );
    }
    if (license?.state === 'EXPIRED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
          <Clock size={14} /> Expirada
        </span>
      );
    }
    if (license?.state === 'BLOCKED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/40">
          <ShieldAlert size={14} /> Bloqueada
        </span>
      );
    }
    if (license?.state === 'REVOKED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-600/20 text-red-400 border border-red-600/40">
          <ShieldX size={14} /> Revogada
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-700 text-slate-300 border border-slate-600">
        <Lock size={14} /> Sem Licença Ativa
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full text-white shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-slate-900 border-b border-slate-700/80 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                Licenciamento DIOGIS
              </h3>
              <p className="text-xs text-slate-400">Gestão e ativação de licenças profissionais</p>
            </div>
          </div>
          <button
            onClick={() => setIsLicenseModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6">
          <button
            type="button"
            onClick={() => {
              setActiveLicenseTab('status');
              clearError();
            }}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
              activeLicenseTab === 'status'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck size={14} /> Minha Licença
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveLicenseTab('activate');
              clearError();
            }}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
              activeLicenseTab === 'activate'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key size={14} /> Ativar PIN
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4 flex-1">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-950/70 border border-red-700/60 rounded-xl flex items-start gap-2.5 text-xs text-red-200">
              <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="p-3 bg-emerald-950/70 border border-emerald-700/60 rounded-xl flex items-start gap-2.5 text-xs text-emerald-200">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1">{successMessage}</div>
            </div>
          )}

          {/* TAB 1: STATUS DA LICENÇA */}
          {activeLicenseTab === 'status' && (
            <div className="space-y-4">
              {/* User Account Bar */}
              <div className="p-3 bg-slate-800/60 border border-slate-700/70 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Conta do Utilizador</span>
                  <span className="text-xs font-semibold text-white">
                    {user ? user.email : 'Utilizador não autenticado'}
                  </span>
                </div>
                {!user ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsLicenseModalOpen(false);
                      setIsAuthModalOpen(true);
                    }}
                    className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold transition"
                  >
                    Entrar / Registar
                  </button>
                ) : (
                  <span className="text-[11px] text-teal-400 font-medium">Sessão ativa</span>
                )}
              </div>

              {/* Status Card */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs text-slate-400">Estado da Licença:</span>
                  {getStatusBadge()}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Plano Atual</span>
                    <span className="font-bold text-white capitalize font-mono">
                      {license?.plan && license.plan !== 'Nenhum'
                        ? license.plan
                        : license?.active
                        ? 'Profissional'
                        : 'Nenhum'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Dias Restantes</span>
                    <span className="font-bold text-amber-300 font-mono">
                      {license?.daysRemaining !== undefined
                        ? `${license.daysRemaining} dias`
                        : license?.active
                        ? 'Ativo'
                        : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Data de Ativação</span>
                    <span className="text-slate-300 font-mono">
                      {formatLicenseDate(license?.activatedAt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Data de Expiração</span>
                    <span className="text-slate-300 font-mono">
                      {formatLicenseDate(license?.expiresAt)}
                    </span>
                  </div>
                </div>

                {license?.pin && (
                  <div className="pt-2 border-t border-slate-800 text-[11px] flex items-center justify-between">
                    <span className="text-slate-400">PIN Ativado:</span>
                    <code className="text-amber-300 font-mono bg-slate-900 px-2 py-0.5 rounded text-[10px] tracking-wider">
                      {license.pin}
                    </code>
                  </div>
                )}

                {license?.licenseKey && (
                  <div className="pt-2 border-t border-slate-800 text-[11px]">
                    <span className="text-slate-400 block mb-0.5">Identificador de Licença:</span>
                    <code className="text-teal-300 font-mono bg-slate-900 px-2 py-0.5 rounded text-[10px]">
                      {license.licenseKey}
                    </code>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveLicenseTab('activate')}
                  className="flex-1 py-2.5 px-4 bg-teal-600 hover:bg-teal-500 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-2"
                >
                  <Key size={14} /> Ativar Novo PIN
                </button>
                <button
                  type="button"
                  onClick={() => refreshLicense()}
                  disabled={licenseLoading}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition flex items-center justify-center gap-1.5"
                >
                  <RotateCw size={13} className={licenseLoading ? 'animate-spin' : ''} />
                  Atualizar
                </button>
              </div>

              {/* WhatsApp Renewal Banner (Mandatory Rule 7) */}
              <div className="mt-4 p-3.5 bg-gradient-to-r from-emerald-950/70 to-slate-900 border border-emerald-800/60 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 shrink-0">
                    <MessageCircle size={20} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-300 block">Precisa de renovar a licença?</span>
                    <span className="text-[11px] text-slate-300">WhatsApp Oficial: {DIOGIS_WHATSAPP_NUMBER}</span>
                  </div>
                </div>
                <a
                  href={DIOGIS_WHATSAPP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-md"
                >
                  <span>Renovar pelo WhatsApp</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}

          {/* TAB 2: ATIVAR PIN */}
          {activeLicenseTab === 'activate' && (
            <form onSubmit={handleActivate} className="space-y-4">
              <div className="p-3.5 bg-amber-950/30 border border-amber-800/40 rounded-xl text-xs text-amber-200 flex items-start gap-2.5">
                <Key size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  Introduza o código PIN adquirido para desbloquear ou renovar a sua subscrição DIOGIS.
                </div>
              </div>

              {!user && (
                <div className="p-3 bg-teal-950/50 border border-teal-800/60 rounded-xl flex items-center justify-between text-xs text-teal-200">
                  <span>É necessário ter sessão iniciada para associar o PIN à sua conta.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLicenseModalOpen(false);
                      setIsAuthModalOpen(true);
                    }}
                    className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold shrink-0 ml-2"
                  >
                    Entrar
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Código PIN de Ativação:
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: DIOGIS-PRO-XXXX-XXXX"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm tracking-wider uppercase focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <button
                type="submit"
                disabled={pinSubmitting || !pinInput.trim()}
                className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg"
              >
                {pinSubmitting ? (
                  <>
                    <RotateCw size={14} className="animate-spin" />
                    Validando PIN no servidor Base44...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} /> Ativar Licença Agora
                  </>
                )}
              </button>

              {/* WhatsApp Purchase / Support */}
              <div className="pt-2 text-center">
                <span className="text-xs text-slate-400 block mb-1.5">Ainda não tem um PIN de ativação?</span>
                <a
                  href={DIOGIS_WHATSAPP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  <MessageCircle size={14} /> Adquira o seu PIN através do WhatsApp {DIOGIS_WHATSAPP_NUMBER}
                </a>
              </div>
            </form>
          )}

          {/* Backend Connection Config Toggle */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Servidor Base44: {appId ? 'Configurado' : 'Pendente'}</span>
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className="text-slate-400 hover:text-white flex items-center gap-1"
            >
              <Settings size={12} /> {showConfig ? 'Ocultar Config' : 'Configurar App ID'}
            </button>
          </div>

          {showConfig && (
            <form onSubmit={handleSaveAppId} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <label className="block text-[11px] text-slate-300">Base44 Application ID:</label>
              <input
                type="text"
                value={tempAppId}
                onChange={(e) => setTempAppId(e.target.value)}
                placeholder="Insira o seu Base44 App ID real"
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white font-mono"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfig(false)}
                  className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-teal-600 hover:bg-teal-500 rounded text-[11px] font-semibold text-white"
                >
                  Salvar e Conectar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
