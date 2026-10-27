import React, { useState } from 'react';
import { useLicense } from '../context/LicenseContext';
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  RotateCw,
  X,
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    user,
    loading,
    error,
    clearError,
    login,
    register,
    verifyOtp,
    resendOtp,
    logout,
    isAuthModalOpen,
    setIsAuthModalOpen,
  } = useLicense();

  const [mode, setMode] = useState<'login' | 'register' | 'verify'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [otpSentNotice, setOtpSentNotice] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'register') {
        await register(email, password, name);
        setMode('verify');
        setOtpSentNotice(true);
      } else if (mode === 'verify') {
        await verifyOtp(email, otpCode);
      }
    } catch (err: any) {
      // Error is caught and stored in context
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    try {
      await resendOtp(email);
      setOtpSentNotice(true);
      setTimeout(() => setOtpSentNotice(false), 4000);
    } catch (err) {
      // Handled in context
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full text-white shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-slate-900 border-b border-slate-700/80 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <User size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {user
                  ? 'A Minha Conta'
                  : mode === 'login'
                  ? 'Iniciar Sessão'
                  : mode === 'register'
                  ? 'Criar Conta DIOGIS'
                  : 'Verificar E-mail'}
              </h3>
              <p className="text-xs text-slate-400">Autenticação Base44 Segura</p>
            </div>
          </div>
          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* User already logged in */}
          {user ? (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                  <ShieldCheck size={16} /> Sessão Ativa
                </div>
                <div className="text-xs">
                  <span className="text-slate-400 block">E-mail:</span>
                  <span className="font-semibold text-white">{user.email}</span>
                </div>
                {user.full_name && (
                  <div className="text-xs">
                    <span className="text-slate-400 block">Nome:</span>
                    <span className="font-semibold text-white">{user.full_name}</span>
                  </div>
                )}
                {user.role && (
                  <div className="text-xs">
                    <span className="text-slate-400 block">Perfil:</span>
                    <span className="font-mono text-teal-300 uppercase">{user.role}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(false)}
                  className="px-4 py-2 border border-slate-700 rounded-xl text-xs text-slate-300 hover:bg-slate-800"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-bold text-white transition"
                >
                  Terminar Sessão
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Error Notice */}
              {error && (
                <div className="p-3 bg-red-950/70 border border-red-700/60 rounded-xl flex items-start gap-2.5 text-xs text-red-200">
                  <AlertTriangle size={15} className="text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">{error}</div>
                </div>
              )}

              {/* OTP Notice */}
              {otpSentNotice && (
                <div className="p-3 bg-teal-950/70 border border-teal-700/60 rounded-xl flex items-start gap-2.5 text-xs text-teal-200">
                  <CheckCircle2 size={15} className="text-teal-400 shrink-0 mt-0.5" />
                  <div className="flex-1">Código de verificação enviado para {email}. Verifique a sua caixa de entrada.</div>
                </div>
              )}

              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nome Completo:</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="Eng. João Silva"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-400"
                    />
                  </div>
                </div>
              )}

              {mode !== 'verify' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Endereço de E-mail:</label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3 top-3 text-slate-500" />
                      <input
                        type="email"
                        required
                        placeholder="topografo@empresa.ao"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Palavra-passe:</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3 top-3 text-slate-500" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-400"
                      />
                    </div>
                  </div>
                </>
              )}

              {mode === 'verify' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Código de Confirmação (OTP):
                  </label>
                  <div className="relative">
                    <KeyRound size={15} className="absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono tracking-widest text-white text-center focus:outline-none focus:border-teal-400"
                    />
                  </div>
                  <div className="mt-2 text-right">
                    <button
                      type="button"
                      onClick={handleResend}
                      className="text-[11px] text-teal-400 hover:underline"
                    >
                      Reenviar código
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg mt-2"
              >
                {submitting ? (
                  <>
                    <RotateCw size={14} className="animate-spin" />
                    A processar...
                  </>
                ) : (
                  <>
                    <span>
                      {mode === 'login'
                        ? 'Entrar na Conta'
                        : mode === 'register'
                        ? 'Concluir Registo'
                        : 'Confirmar Código'}
                    </span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>

              {/* Mode switch */}
              <div className="pt-2 text-center text-xs text-slate-400">
                {mode === 'login' ? (
                  <span>
                    Ainda não tem conta?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        clearError();
                      }}
                      className="text-teal-400 hover:underline font-semibold"
                    >
                      Registar agora
                    </button>
                  </span>
                ) : (
                  <span>
                    Já possui conta?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        clearError();
                      }}
                      className="text-teal-400 hover:underline font-semibold"
                    >
                      Iniciar sessão
                    </button>
                  </span>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
