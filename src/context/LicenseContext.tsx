import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Base44User, LicenseStatus } from '../types/license';
import {
  getBase44AppId,
  setBase44AppId,
  getBase44Client,
  getCurrentUser,
  fetchLicenseStatus,
  activatePin as apiActivatePin,
  loginViaEmail,
  registerUser,
  verifyUserOtp,
  resendUserOtp,
  logoutUser,
  formatBase44Error,
} from '../services/base44Client';

export const DIOGIS_WHATSAPP_NUMBER = '923 213 783';
export const DIOGIS_WHATSAPP_LINK =
  'https://wa.me/244923213783?text=Ola%2C%20pretendo%20renovar%20a%20minha%20licenca%20do%20DIOGIS.';

interface LicenseContextType {
  appId: string;
  setAppId: (newId: string) => void;
  user: Base44User | null;
  license: LicenseStatus | null;
  loading: boolean;
  licenseLoading: boolean;
  error: string | null;
  isLicenseActive: boolean;
  isAdmin: boolean;
  refreshLicense: () => Promise<LicenseStatus | null>;
  checkLicenseBeforeAction: (actionName?: string) => Promise<boolean>;
  activatePin: (pin: string) => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name?: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  // Modal controllers
  isLicenseModalOpen: boolean;
  setIsLicenseModalOpen: (open: boolean) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isAdminModalOpen: boolean;
  setIsAdminModalOpen: (open: boolean) => void;
  activeLicenseTab: 'status' | 'activate' | 'history';
  setActiveLicenseTab: (tab: 'status' | 'activate' | 'history') => void;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

export const LicenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appId, setAppIdState] = useState<string>(() => getBase44AppId());
  const [user, setUser] = useState<Base44User | null>(null);
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [licenseLoading, setLicenseLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [activeLicenseTab, setActiveLicenseTab] = useState<'status' | 'activate' | 'history'>('status');

  const updateAppId = (newId: string) => {
    setBase44AppId(newId);
    setAppIdState(newId.trim());
  };

  // Refresh user and license
  const refreshLicense = useCallback(async (): Promise<LicenseStatus | null> => {
    const currentAppId = getBase44AppId();
    if (!currentAppId) {
      setLicense({
        active: false,
        state: 'NOT_FOUND',
        message: 'Base44 não configurado. Defina o App ID do backend.',
      });
      return null;
    }

    setLicenseLoading(true);
    try {
      // 1. Refresh current authenticated user
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      // 2. Query diogisLicenseStatus from server
      const status = await fetchLicenseStatus();
      setLicense(status);
      setError(null);
      return status;
    } catch (err: any) {
      const msg = formatBase44Error(err);
      setError(msg);
      // Under network/server failure, never grant a valid license based on local state (Rule 12)
      setLicense((prev) => ({
        active: false,
        state: prev?.state || 'INACTIVE',
        message: msg,
      }));
      return null;
    } finally {
      setLicenseLoading(false);
    }
  }, []);

  // Initial startup check
  useEffect(() => {
    let isMounted = true;
    const initialize = async () => {
      setLoading(true);
      try {
        const u = await getCurrentUser();
        if (isMounted) setUser(u);

        const currentAppId = getBase44AppId();
        if (currentAppId) {
          const lic = await fetchLicenseStatus();
          if (isMounted) setLicense(lic);
        }
      } catch (err: any) {
        if (isMounted) setError(formatBase44Error(err));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initialize();
    return () => {
      isMounted = false;
    };
  }, [appId]);

  /**
   * Verified check before protected actions (e.g. creating new projects).
   * Refreshes license from backend to ensure status is up to date and not expired.
   */
  const checkLicenseBeforeAction = async (actionName = 'Esta operação'): Promise<boolean> => {
    setLicenseLoading(true);
    try {
      const freshStatus = await fetchLicenseStatus();
      setLicense(freshStatus);

      if (freshStatus.active === true) {
        return true;
      }

      // If inactive, expired, blocked, or revoked: block action and open license modal
      setError(`${actionName} requer uma licença ativa do DIOGIS.`);
      setActiveLicenseTab('status');
      setIsLicenseModalOpen(true);
      return false;
    } catch (err: any) {
      const msg = formatBase44Error(err);
      setError(`Falha ao validar a licença: ${msg}`);
      setIsLicenseModalOpen(true);
      return false;
    } finally {
      setLicenseLoading(false);
    }
  };

  /**
   * Activates a purchased PIN.
   */
  const activatePinHandler = async (pin: string): Promise<void> => {
    setError(null);
    setLicenseLoading(true);
    try {
      const res = await apiActivatePin(pin);
      if (res?.license) {
        setLicense(res.license);
      }
      try {
        const fresh = await refreshLicense();
        if (fresh && (fresh.active || (fresh.plan && fresh.plan !== 'Nenhum'))) {
          setLicense(fresh);
        }
      } catch (syncErr) {
        console.warn('Sincronização em segundo plano após ativação:', syncErr);
      }
    } catch (err: any) {
      const msg = formatBase44Error(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLicenseLoading(false);
    }
  };

  /**
   * User login
   */
  const loginHandler = async (email: string, pass: string): Promise<void> => {
    setError(null);
    setLoading(true);
    try {
      const u = await loginViaEmail(email, pass);
      setUser(u);
      setIsAuthModalOpen(false);
      await refreshLicense();
    } catch (err: any) {
      const msg = formatBase44Error(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * User register
   */
  const registerHandler = async (email: string, pass: string, name?: string): Promise<void> => {
    setError(null);
    setLoading(true);
    try {
      await registerUser(email, pass, name);
    } catch (err: any) {
      const msg = formatBase44Error(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verify email OTP
   */
  const verifyOtpHandler = async (email: string, otp: string): Promise<void> => {
    setError(null);
    setLoading(true);
    try {
      const res = await verifyUserOtp(email, otp);
      if (res?.access_token) {
        const client = getBase44Client();
        client?.auth.setToken(res.access_token);
      }
      const u = await getCurrentUser();
      setUser(u);
      setIsAuthModalOpen(false);
      await refreshLicense();
    } catch (err: any) {
      const msg = formatBase44Error(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Resend OTP
   */
  const resendOtpHandler = async (email: string): Promise<void> => {
    setError(null);
    try {
      await resendUserOtp(email);
    } catch (err: any) {
      const msg = formatBase44Error(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  /**
   * Logout
   */
  const logoutHandler = async (): Promise<void> => {
    setLoading(true);
    try {
      await logoutUser();
      setUser(null);
      setLicense(null);
      setIsAdminModalOpen(false);
    } catch (err: any) {
      console.warn('Erro ao sair:', err);
    } finally {
      setLoading(false);
    }
  };

  const isLicenseActive = Boolean(license?.active === true);
  // Admin permissions confirmed strictly by backend
  const isAdmin = Boolean(
    (license?.isAdmin === true || license?.canAdmin === true || user?.role === 'admin' || user?.is_admin === true)
  );

  return (
    <LicenseContext.Provider
      value={{
        appId,
        setAppId: updateAppId,
        user,
        license,
        loading,
        licenseLoading,
        error,
        isLicenseActive,
        isAdmin,
        refreshLicense,
        checkLicenseBeforeAction,
        activatePin: activatePinHandler,
        login: loginHandler,
        register: registerHandler,
        verifyOtp: verifyOtpHandler,
        resendOtp: resendOtpHandler,
        logout: logoutHandler,
        clearError: () => setError(null),
        isLicenseModalOpen,
        setIsLicenseModalOpen,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isAdminModalOpen,
        setIsAdminModalOpen,
        activeLicenseTab,
        setActiveLicenseTab,
      }}
    >
      {children}
    </LicenseContext.Provider>
  );
};

export function useLicense(): LicenseContextType {
  const context = useContext(LicenseContext);
  if (!context) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return context;
}
