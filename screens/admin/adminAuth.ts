const ADMIN_EMAIL = 'levelupaiapp@gmail.com';
const ADMIN_PASSWORD = 'Admin';
const ADMIN_AUTH_KEY = 'admin-auth';

export const adminCredentials = {
  email: ADMIN_EMAIL,
  password: ADMIN_PASSWORD,
};

export const loginAdmin = (email: string, password: string): boolean => {
  const valid = email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD;
  if (valid) {
    localStorage.setItem(ADMIN_AUTH_KEY, 'true');
    localStorage.setItem('admin-auth-email', ADMIN_EMAIL);
  }
  return valid;
};

export const logoutAdmin = () => {
  localStorage.removeItem(ADMIN_AUTH_KEY);
  localStorage.removeItem('admin-auth-email');
};

export const isAdminLoggedIn = (): boolean => localStorage.getItem(ADMIN_AUTH_KEY) === 'true';

export const getAdminResetHint = () => ({
  email: ADMIN_EMAIL,
  password: ADMIN_PASSWORD,
});
