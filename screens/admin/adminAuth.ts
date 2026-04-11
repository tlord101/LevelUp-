import { signOutUser, signInWithEmail, sendPasswordReset } from '../../services/firebaseService';
import { ensureAdminUserRecord, getAdminUsersAndRoles } from '../../services/adminService';
import { auth } from '../../config/firebase';

const ADMIN_AUTH_KEY = 'admin-auth';
const ADMIN_AUTH_EMAIL = 'admin-auth-email';
const ADMIN_AUTH_UID = 'admin-auth-uid';
const ADMIN_AUTH_ROLE = 'admin-auth-role';
const BOOTSTRAP_ADMIN_UID = 'piCoaqJccwVLqaCVAEixZs0Ohhw1';

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
    const credential = await signInWithEmail(normalized, password);
    const signedInUid = credential.user?.uid || auth.currentUser?.uid || '';
    const signedInEmail = normalizeEmail(credential.user?.email || auth.currentUser?.email || normalized);
    const adminUsers = await getAdminUsersAndRoles();
    let adminRecord = adminUsers.find((item: any) => {
      const matchesEmail = normalizeEmail(item?.email || '') === signedInEmail;
      const matchesUid = !!signedInUid && String(item?.uid || '') === signedInUid;
      return item?.active !== false && (matchesEmail || matchesUid);
    });

    if (!adminRecord && signedInUid === BOOTSTRAP_ADMIN_UID) {
      adminRecord = await ensureAdminUserRecord({
        email: signedInEmail,
        uid: signedInUid,
        role: 'super-admin',
        active: true,
      });
    }

    if (!adminRecord) {
      await signOutUser();
      return { ok: false, error: 'Your account is not authorized for admin access.' };
    }

    localStorage.setItem(ADMIN_AUTH_KEY, 'true');
    localStorage.setItem(ADMIN_AUTH_EMAIL, signedInEmail);
    if (signedInUid) {
      localStorage.setItem(ADMIN_AUTH_UID, signedInUid);
    }
    localStorage.setItem(ADMIN_AUTH_ROLE, String(adminRecord.role || 'support'));
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error?.message || 'Invalid admin credentials.' };
  }
};

export const logoutAdmin = async () => {
  localStorage.removeItem(ADMIN_AUTH_KEY);
  localStorage.removeItem(ADMIN_AUTH_EMAIL);
  localStorage.removeItem(ADMIN_AUTH_UID);
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
  const storedUid = localStorage.getItem(ADMIN_AUTH_UID) || '';
  const activeEmail = auth.currentUser?.email || '';
  const activeUid = auth.currentUser?.uid || '';
  return (!!storedUid && !!activeUid && storedUid === activeUid) || (!!storedEmail && !!activeEmail && storedEmail.toLowerCase() === activeEmail.toLowerCase());
};

export const getAdminSession = () => ({
  email: localStorage.getItem(ADMIN_AUTH_EMAIL) || '',
  uid: localStorage.getItem(ADMIN_AUTH_UID) || '',
  role: localStorage.getItem(ADMIN_AUTH_ROLE) || 'support',
});

export const requestAdminPasswordReset = async (email: string) => {
  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error('Email is required.');
  await sendPasswordReset(normalized);
};
