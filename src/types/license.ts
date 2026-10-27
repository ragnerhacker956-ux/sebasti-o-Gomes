export interface Base44User {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  is_admin?: boolean;
  email_verified?: boolean;
  [key: string]: any;
}

export type LicensePlan = 'TRIAL' | 'MENSAL' | 'TRIMESTRAL' | 'ANUAL' | 'VITALICIO' | 'PROFISSIONAL';
export type LicenseState = 'ACTIVE' | 'EXPIRED' | 'BLOCKED' | 'REVOKED' | 'NOT_FOUND' | 'INACTIVE';

export interface LicenseStatus {
  active: boolean;
  state: LicenseState;
  plan?: LicensePlan | string;
  activatedAt?: string;
  expiresAt?: string;
  daysRemaining?: number;
  pin?: string;
  licenseKey?: string;
  isAdmin?: boolean;
  canAdmin?: boolean;
  message?: string;
  userEmail?: string;
  raw?: any;
}

export interface PinItem {
  id: string;
  pin: string;
  plan: string;
  durationDays: number;
  status: 'AVAILABLE' | 'USED' | 'BLOCKED' | 'REVOKED';
  createdAt: string;
  usedAt?: string;
  usedByEmail?: string;
  notes?: string;
}

export interface GeneratePinsParams {
  count: number;
  plan: string;
  durationDays: number;
  notes?: string;
}
