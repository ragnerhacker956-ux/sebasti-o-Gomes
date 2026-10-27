import { createClient } from '@base44/sdk';
import { Base44User, LicenseStatus, PinItem, GeneratePinsParams } from '../types/license';

const STORAGE_APP_ID_KEY = 'diogis_base44_app_id';

/**
 * Retrieves the configured Base44 App ID.
 * Checked in order:
 * 1. Environment variable VITE_BASE44_APP_ID
 * 2. Local storage preference (allows user to connect without rebuilding)
 */
export function getBase44AppId(): string {
  const envId = import.meta.env.VITE_BASE44_APP_ID;
  if (envId && typeof envId === 'string' && envId.trim()) {
    return envId.trim();
  }
  const localId = localStorage.getItem(STORAGE_APP_ID_KEY);
  if (localId && typeof localId === 'string' && localId.trim()) {
    return localId.trim();
  }
  return '';
}

/**
 * Saves a new Base44 App ID to local storage.
 */
export function setBase44AppId(appId: string): void {
  if (!appId || !appId.trim()) {
    localStorage.removeItem(STORAGE_APP_ID_KEY);
  } else {
    localStorage.setItem(STORAGE_APP_ID_KEY, appId.trim());
  }
  // Reset client instance so it re-initializes on next call
  activeClient = null;
}

// Cached client singleton
let activeClient: ReturnType<typeof createClient> | null = null;
let currentAppId = '';

/**
 * Returns the initialized Base44 SDK client instance, or null if App ID is not yet configured.
 */
export function getBase44Client(): ReturnType<typeof createClient> | null {
  const appId = getBase44AppId();
  if (!appId) {
    return null;
  }

  if (!activeClient || currentAppId !== appId) {
    try {
      activeClient = createClient({ appId });
      currentAppId = appId;
    } catch (err) {
      console.error('Falha ao inicializar o cliente Base44 SDK:', err);
      return null;
    }
  }

  return activeClient;
}

/**
 * Extracts human-readable error messages from Axios / Base44 function errors.
 */
export function formatBase44Error(err: any): string {
  if (!err) return 'Erro desconhecido de comunicação com o servidor.';

  // Check err.response.data
  const resData = err.response?.data;
  if (resData) {
    if (typeof resData === 'string') return resData;
    if (resData.message) return String(resData.message);
    if (resData.error) return String(resData.error);
    if (resData.detail) return String(resData.detail);
  }

  if (err.message) {
    if (err.message.includes('Network Error') || err.message.includes('Failed to fetch')) {
      return 'Falha de ligação ao servidor de licenciamento. Verifique a sua conexão com a Internet.';
    }
    if (err.message.includes('401') || err.message.includes('Unauthorized')) {
      return 'Sessão expirada ou não autenticada. Por favor, faça login novamente.';
    }
    return err.message;
  }

  return 'Ocorreu um erro ao processar a operação no servidor Base44.';
}

/* =========================================================================
   AUTH SERVICE METHODS
   ========================================================================= */

export async function getCurrentUser(): Promise<Base44User | null> {
  const client = getBase44Client();
  if (!client) return null;

  try {
    // Check if client has a stored access token before querying /api/users/me
    // According to @base44/sdk: Skip user lookup for anonymous visitors
    if (!client.auth.hasToken()) {
      return null;
    }
    const user = await client.auth.me();
    return (user as Base44User) || null;
  } catch (err: any) {
    // If the token is invalid or expired (401), clean up the stale token
    if (err?.status === 401 || err?.statusCode === 401 || err?.message?.includes('401')) {
      try {
        client.auth.logout();
      } catch {
        // ignore
      }
    }
    return null;
  }
}

export async function loginViaEmail(email: string, password: string): Promise<Base44User> {
  const client = getBase44Client();
  if (!client) {
    throw new Error('ID da aplicação Base44 não configurado. Por favor, configure o ID do backend.');
  }

  const res = await client.auth.loginViaEmailPassword(email.trim(), password);
  if (res?.access_token) {
    client.auth.setToken(res.access_token);
  }
  const user = await client.auth.me();
  return user as Base44User;
}

export async function registerUser(email: string, password: string, name?: string): Promise<any> {
  const client = getBase44Client();
  if (!client) {
    throw new Error('ID da aplicação Base44 não configurado. Por favor, configure o ID do backend.');
  }

  return await (client.auth.register as any)({
    email: email.trim(),
    password,
    full_name: name?.trim() || '',
    name: name?.trim() || '',
  });
}

export async function verifyUserOtp(email: string, otp: string): Promise<any> {
  const client = getBase44Client();
  if (!client) {
    throw new Error('ID da aplicação Base44 não configurado.');
  }

  return await (client.auth.verifyOtp as any)({
    email: email.trim(),
    otpCode: otp.trim(),
  });
}

export async function resendUserOtp(email: string): Promise<any> {
  const client = getBase44Client();
  if (!client) {
    throw new Error('ID da aplicação Base44 não configurado.');
  }

  return await client.auth.resendOtp(email.trim());
}

export async function logoutUser(): Promise<void> {
  const client = getBase44Client();
  if (!client) return;

  try {
    await client.auth.logout();
  } catch (err) {
    console.warn('Erro ao efetuar logout no Base44:', err);
  }
}

/**
 * Normalizes license data returned from Base44 functions (diogisLicenseStatus / diogisActivatePin).
 * Handles nested objects ({ license: ... }, { data: ... }), snake_case, and Portuguese field names.
 */
export function normalizeLicenseData(raw: any, fallbackPin?: string): LicenseStatus {
  if (!raw) {
    return {
      active: false,
      state: 'INACTIVE',
      message: 'Nenhum dado de licença retornado.',
    };
  }

  // Unnest deeply if wrapped in { license: ... }, { data: ... }, { result: ... }, { licenca: ... }
  let target: Record<string, any> = { ...raw };
  for (let i = 0; i < 4; i++) {
    if (target.license && typeof target.license === 'object' && !Array.isArray(target.license)) {
      target = { ...target, ...target.license };
    } else if (target.data && typeof target.data === 'object' && !Array.isArray(target.data)) {
      target = { ...target, ...target.data };
    } else if (target.result && typeof target.result === 'object' && !Array.isArray(target.result)) {
      target = { ...target, ...target.result };
    } else if (target.licenca && typeof target.licenca === 'object' && !Array.isArray(target.licenca)) {
      target = { ...target, ...target.licenca };
    } else {
      break;
    }
  }

  // 1. Determine active boolean
  const rawStatus = String(
    target.status ||
    target.state ||
    target.estado ||
    target.license_status ||
    target.licenseStatus ||
    target.situacao ||
    ''
  ).toUpperCase();

  const isActive = Boolean(
    target.active === true ||
    target.is_active === true ||
    target.isActive === true ||
    target.valid === true ||
    target.isValid === true ||
    target.is_valid === true ||
    target.habilitado === true ||
    rawStatus === 'ACTIVE' ||
    rawStatus === 'ATIVA' ||
    rawStatus === 'ATIVO' ||
    rawStatus === 'VALID' ||
    rawStatus === 'VALIDA' ||
    rawStatus === 'VALIDO' ||
    (target.success === true &&
      !rawStatus.includes('INACT') &&
      !rawStatus.includes('EXPIR') &&
      !rawStatus.includes('BLOCK') &&
      !rawStatus.includes('REVOG') &&
      (target.plan ||
        target.plan_name ||
        target.plano ||
        target.expiresAt ||
        target.expires_at ||
        target.days_remaining ||
        target.dias_restantes ||
        target.pin ||
        target.lastPin))
  );

  // 2. Determine Plan
  const plan =
    target.plan ||
    target.planName ||
    target.plan_name ||
    target.plano ||
    target.nome_plano ||
    target.plano_nome ||
    target.tier ||
    target.tipo ||
    target.package ||
    target.tipo_plano ||
    target.plan_type ||
    (isActive ? 'Profissional' : 'Nenhum');

  // 3. Determine Dates
  const activatedAt =
    target.activatedAt ||
    target.activated_at ||
    target.activationDate ||
    target.activation_date ||
    target.dataAtivacao ||
    target.data_ativacao ||
    target.data_inicio ||
    target.inicio ||
    target.startDate ||
    target.start_date ||
    target.createdAt ||
    target.created_at ||
    target.created_date;

  const expiresAt =
    target.expiresAt ||
    target.expires_at ||
    target.expirationDate ||
    target.expiration_date ||
    target.dataExpiracao ||
    target.data_expiracao ||
    target.data_fim ||
    target.data_validade ||
    target.validade ||
    target.validUntil ||
    target.valid_until ||
    target.expiryDate ||
    target.expiry_date ||
    target.endDate ||
    target.end_date ||
    target.expira_em ||
    target.expires ||
    target.valid_thru;

  // 4. Determine Days Remaining
  let daysRemaining: number | undefined = undefined;
  const rawDays =
    target.daysRemaining ??
    target.days_remaining ??
    target.diasRestantes ??
    target.dias_restantes ??
    target.remainingDays ??
    target.remaining_days ??
    target.dias;

  if (typeof rawDays === 'number') {
    daysRemaining = rawDays;
  } else if (rawDays !== undefined && rawDays !== null) {
    const parsed = parseInt(String(rawDays), 10);
    if (!isNaN(parsed)) daysRemaining = parsed;
  }

  // If not provided directly, calculate from expiresAt
  if (daysRemaining === undefined && expiresAt) {
    let expTime: number = NaN;
    const num = Number(expiresAt);
    if (!isNaN(num) && num > 0) {
      expTime = num < 10000000000 ? num * 1000 : num;
    } else {
      expTime = new Date(expiresAt).getTime();
    }
    if (!isNaN(expTime)) {
      const diffMs = expTime - Date.now();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }
  }

  // 5. Determine State
  let state: LicenseStatus['state'] = 'INACTIVE';
  if (rawStatus.includes('BLOCK') || target.blocked === true || target.is_blocked === true) {
    state = 'BLOCKED';
  } else if (rawStatus.includes('REVOK') || rawStatus.includes('REVOG') || target.revoked === true || target.is_revoked === true) {
    state = 'REVOKED';
  } else if (rawStatus.includes('EXPIR') || target.expired === true || target.is_expired === true || (daysRemaining !== undefined && daysRemaining <= 0)) {
    state = 'EXPIRED';
  } else if (isActive) {
    state = 'ACTIVE';
  } else if (target.state) {
    state = String(target.state).toUpperCase() as any;
  }

  const pin = target.pin || target.lastPin || target.codigoPin || target.codigo_pin || fallbackPin;
  const licenseKey = target.licenseKey || target.license_key || target.id || target._id || target.key;

  const isAdmin = Boolean(
    target.isAdmin === true ||
    target.is_admin === true ||
    target.canAdmin === true ||
    target.can_admin === true ||
    target.role === 'admin'
  );

  return {
    active: isActive && state !== 'EXPIRED' && state !== 'BLOCKED' && state !== 'REVOKED',
    state,
    plan: String(plan),
    activatedAt: activatedAt ? String(activatedAt) : undefined,
    expiresAt: expiresAt ? String(expiresAt) : undefined,
    daysRemaining,
    pin: pin ? String(pin) : undefined,
    licenseKey: licenseKey ? String(licenseKey) : undefined,
    isAdmin,
    canAdmin: isAdmin,
    message: target.message || target.msg,
    userEmail: target.userEmail || target.user_email || target.email,
    raw,
  };
}

/**
 * Fetches the current user's license status from the backend function `diogisLicenseStatus`.
 * Does not invent data. Returns response.data from server.
 */
export async function fetchLicenseStatus(): Promise<LicenseStatus> {
  const client = getBase44Client();
  if (!client) {
    return {
      active: false,
      state: 'NOT_FOUND',
      message: 'Base44 não configurado. Conecte o App ID do seu backend.',
    };
  }

  const lastPin = localStorage.getItem('diogis_last_pin') || '';

  // If user is not authenticated and has no activated pin, they don't have an active license
  if (!client.auth.hasToken() && !lastPin) {
    return {
      active: false,
      state: 'INACTIVE',
      message: 'Inicie sessão ou ative um PIN para consultar a sua licença.',
    };
  }

  try {
    const response = await client.functions.invoke('diogisLicenseStatus', {
      pin: lastPin || undefined,
    });
    const data = response?.data;

    if (!data) {
      return {
        active: false,
        state: 'NOT_FOUND',
        message: 'Resposta vazia do servidor de licenciamento.',
      };
    }

    const normalized = normalizeLicenseData(data, lastPin);
    if (normalized.active && normalized.pin) {
      localStorage.setItem('diogis_last_pin', normalized.pin);
    }
    return normalized;
  } catch (err: any) {
    if (err?.status === 401 || err?.statusCode === 401 || err?.message?.includes('401')) {
      try {
        client.auth.logout();
      } catch {
        // ignore
      }
      return {
        active: false,
        state: 'INACTIVE',
        message: 'A sua sessão expirou. Por favor, faça login novamente.',
      };
    }
    const msg = formatBase44Error(err);
    throw new Error(msg);
  }
}

/**
 * Activates a purchased PIN via the backend function `diogisActivatePin`.
 */
export async function activatePin(pin: string): Promise<{ success: boolean; message: string; license?: LicenseStatus }> {
  const client = getBase44Client();
  if (!client) {
    throw new Error('ID da aplicação Base44 não configurado.');
  }

  const cleanPin = pin.trim().toUpperCase();
  if (!cleanPin) {
    throw new Error('Por favor, introduza um PIN válido.');
  }

  try {
    const response = await client.functions.invoke('diogisActivatePin', { pin: cleanPin });
    const data = response?.data;

    const normalized = normalizeLicenseData(data?.license || data?.data || data, cleanPin);
    if (normalized.active || normalized.state === 'ACTIVE') {
      localStorage.setItem('diogis_last_pin', cleanPin);
    }

    return {
      success: data?.success !== false,
      message: data?.message || 'PIN ativado com sucesso!',
      license: normalized,
    };
  } catch (err: any) {
    const msg = formatBase44Error(err);
    throw new Error(msg);
  }
}

/* =========================================================================
   ADMINISTRATIVE BACKEND FUNCTIONS
   ========================================================================= */

/**
 * Admin: Generates new licensing PINs via `diogisAdminGeneratePins`.
 */
export async function adminGeneratePins(params: GeneratePinsParams): Promise<{ success: boolean; pins: PinItem[]; message?: string }> {
  const client = getBase44Client();
  if (!client) {
    throw new Error('ID da aplicação Base44 não configurado.');
  }
  if (!client.auth.hasToken()) {
    throw new Error('Operação administrativa requer autenticação prévia de administrador.');
  }

  try {
    const response = await client.functions.invoke('diogisAdminGeneratePins', params);
    const data = response?.data;

    return {
      success: data?.success !== false,
      pins: (data?.pins || data?.generatedPins || data || []) as PinItem[],
      message: data?.message,
    };
  } catch (err: any) {
    const msg = formatBase44Error(err);
    throw new Error(msg);
  }
}

/**
 * Admin: Lists all PINs and licenses via `diogisAdminListPins`.
 */
export async function adminListPins(): Promise<{ pins: PinItem[]; total?: number }> {
  const client = getBase44Client();
  if (!client) {
    throw new Error('ID da aplicação Base44 não configurado.');
  }
  if (!client.auth.hasToken()) {
    throw new Error('Operação administrativa requer autenticação prévia de administrador.');
  }

  try {
    const response = await client.functions.invoke('diogisAdminListPins', {});
    const data = response?.data;

    const pins = (Array.isArray(data) ? data : data?.pins || data?.items || []) as PinItem[];
    return {
      pins,
      total: data?.total ?? pins.length,
    };
  } catch (err: any) {
    const msg = formatBase44Error(err);
    throw new Error(msg);
  }
}

/**
 * Admin: Performs an action on a PIN (block, unblock, revoke) via `diogisAdminPinAction`.
 */
export async function adminPinAction(pinId: string, action: 'block' | 'unblock' | 'revoke'): Promise<{ success: boolean; message?: string }> {
  const client = getBase44Client();
  if (!client) {
    throw new Error('ID da aplicação Base44 não configurado.');
  }
  if (!client.auth.hasToken()) {
    throw new Error('Operação administrativa requer autenticação prévia de administrador.');
  }

  try {
    const response = await client.functions.invoke('diogisAdminPinAction', { pinId, action });
    const data = response?.data;

    return {
      success: data?.success !== false,
      message: data?.message || `Ação '${action}' executada com sucesso.`,
    };
  } catch (err: any) {
    const msg = formatBase44Error(err);
    throw new Error(msg);
  }
}
