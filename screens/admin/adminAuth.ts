import { signOutUser, signInWithEmail, sendPasswordReset } from '../../services/firebaseService';
import { getAdminUsersAndRoles } from '../../services/adminService';
import { auth } from '../../config/firebase';

const ADMIN_AUTH_KEY = 'admin-auth';
const ADMIN_AUTH_EMAIL = 'admin-auth-email';
const ADMIN_AUTH_ROLE = 'admin-auth-role';

type LoginResult = {
  ok: boolean;
  error?: string;
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const loginAdmin = async (email: string, password: string): Promise<LoginResult> => {
  const normalized = normalizeEmail(email);
  if (!normalized || !password) {
    return { ok: false, error: 'Email and password are required.' };
  }

  try {
    await signInWithEmail(normalized, password);
    const adminUsers = await getAdminUsersAndRoles();
    const adminRecord = adminUsers.find((item: any) => normalizeEmail(item?.email || '') === normalized && item?.active !== false);

    if (!adminRecord) {
      await signOutUser();
      return { ok: false, error: 'Your account is not authorized for admin access.' };
    }

    localStorage.setItem(ADMIN_AUTH_KEY, 'true');
    localStorage.setItem(ADMIN_AUTH_EMAIL, normalized);
    localStorage.setItem(ADMIN_AUTH_ROLE, String(adminRecord.role || 'support'));
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error?.message || 'Invalid admin credentials.' };
  }
};

export const logoutAdmin = async () => {
  localStorage.removeItem(ADMIN_AUTH_KEY);
  localStorage.removeItem(ADMIN_AUTH_EMAIL);
  localStorage.removeItem(ADMIN_AUTH_ROLE);
  try {
    await signOutUser();
  } catch {
    // No-op: local session is still cleared.
  }
};

export const isAdminLoggedIn = (): boolean => {
  if (localStorage.getItem(ADMIN_AUTH_KEY) !== 'true') return false;
  const storedEmail = localStorage.getItem(ADMIN_AUTH_EMAIL) || '';
  const activeEmail = auth.currentUser?.email || '';
  return !!storedEmail && !!activeEmail && storedEmail.toLowerCase() === activeEmail.toLowerCase();
};

export const getAdminSession = () => ({
  email: localStorage.getItem(ADMIN_AUTH_EMAIL) || '',
  role: localStorage.getItem(ADMIN_AUTH_ROLE) || 'support',
});

export const requestAdminPasswordReset = async (email: string) => {
  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error('Email is required.');
  await sendPasswordReset(normalized);
};
