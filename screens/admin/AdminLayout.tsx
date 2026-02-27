import React, { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Scan,
  Trophy,
  CreditCard,
  FileText,
  MessageSquare,
  Bell,
  Settings,
  Shield,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Moon,
  Sun,
  Menu,
  X,
} from 'lucide-react';
import { shellClass, ThemeMode } from './components/AdminWidgets';
import { logoutAdmin } from './adminAuth';

type NavItem = { label: string; path: string; disabled?: boolean };
type NavSection = { key: string; label: string; icon: React.ReactNode; basePath: string; items?: NavItem[] };

const navSections: NavSection[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, basePath: '/admin/dashboard' },
  { key: 'users', label: 'User Management', icon: <Users size={18} />, basePath: '/admin/users', items: [
    { label: 'All Users', path: '/admin/users/all' },
    { label: 'User Details', path: '/admin/users/u_1001' },
    { label: 'Levels & XP', path: '/admin/users/levels' },
    { label: 'Subscriptions', path: '/admin/users/subscriptions' },
    { label: 'Banned Users', path: '/admin/users/banned' },
  ] },
  { key: 'scanners', label: 'AI Scanners', icon: <Scan size={18} />, basePath: '/admin/scanners', items: [
    { label: 'Body Scanner', path: '/admin/scanners/body' },
    { label: 'Face Scanner', path: '/admin/scanners/face' },
    { label: 'Food Scanner', path: '/admin/scanners/food' },
    { label: 'Flagged Scans', path: '/admin/scanners/flagged' },
  ] },
  { key: 'gamification', label: 'Gamification', icon: <Trophy size={18} />, basePath: '/admin/gamification', items: [
    { label: 'XP Rules', path: '/admin/gamification/xp' },
    { label: 'Levels', path: '/admin/gamification/levels' },
    { label: 'Streaks & Rewards', path: '/admin/gamification/streaks' },
    { label: 'Badges', path: '/admin/gamification/badges' },
  ] },
  { key: 'payments', label: 'Payments & Subscriptions', icon: <CreditCard size={18} />, basePath: '/admin/payments', items: [
    { label: 'Plans', path: '/admin/payments/plans' },
    { label: 'Transactions', path: '/admin/payments/transactions' },
    { label: 'Subscriptions', path: '/admin/payments/subscriptions' },
    { label: 'Refunds', path: '/admin/payments/refunds', disabled: true },
    { label: 'Stripe Status', path: '/admin/payments/stripe' },
  ] },
  { key: 'content', label: 'Content Manager', icon: <FileText size={18} />, basePath: '/admin/content', items: [
    { label: 'Workout Plans', path: '/admin/content/workouts' },
    { label: 'Diet Plans', path: '/admin/content/diets' },
    { label: 'Skincare Guides', path: '/admin/content/skincare' },
    { label: 'AI Prompt Templates', path: '/admin/content/prompts' },
  ] },
  { key: 'community', label: 'Community & Moderation', icon: <MessageSquare size={18} />, basePath: '/admin/community', items: [
    { label: 'Posts & Comments', path: '/admin/community/posts' },
    { label: 'Groups', path: '/admin/community/groups' },
    { label: 'Reports', path: '/admin/community/reports' },
    { label: 'Blocked Users', path: '/admin/community/blocked' },
  ] },
  { key: 'notifications', label: 'Notifications', icon: <Bell size={18} />, basePath: '/admin/notifications', items: [
    { label: 'Push Notifications', path: '/admin/notifications/push' },
    { label: 'In-App Announcements', path: '/admin/notifications/in-app' },
    { label: 'Email Campaigns', path: '/admin/notifications/email' },
  ] },
  { key: 'settings', label: 'System Settings', icon: <Settings size={18} />, basePath: '/admin/settings', items: [
    { label: 'General Settings', path: '/admin/settings/general' },
    { label: 'Email (Gmail / SMTP)', path: '/admin/settings/email' },
    { label: 'API & Integrations', path: '/admin/settings/api' },
    { label: 'Security & Roles', path: '/admin/settings/security' },
    { label: 'Appearance', path: '/admin/settings/appearance' },
    { label: 'System & Cache', path: '/admin/settings/system' },
  ] },
  { key: 'admins', label: 'Admin Management', icon: <Shield size={18} />, basePath: '/admin/admins', items: [{ label: 'Admin Users, Roles & Audit Logs', path: '/admin/admins' }] },
];

const AdminLayout: React.FC = () => {
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem('admin-theme') as ThemeMode) || 'light');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => Object.fromEntries(navSections.map((s) => [s.key, true])));

  const location = useLocation();
  const pathname = location.pathname;

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('admin-theme', next);
  };

  return (
    <div className={`min-h-screen ${shellClass[theme].page}`}>
      <div className="flex min-h-screen">
        <aside className={`${shellClass[theme].panel} ${collapsed ? 'w-20' : 'w-72'} fixed left-0 top-0 z-40 h-screen overflow-y-auto transition-all lg:static lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <div className="flex items-center justify-between px-4 py-4">
            <Link to="/admin/dashboard" className="text-lg font-bold tracking-tight">{collapsed ? 'LU' : 'LevelUp Admin'}</Link>
            <button type="button" onClick={() => setCollapsed((v) => !v)} className="hidden rounded-md p-1 lg:block">{collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}</button>
            <button type="button" onClick={() => setMobileOpen(false)} className="rounded-md p-1 lg:hidden"><X size={18} /></button>
          </div>

          <nav className="space-y-2 px-3 pb-6">
            {navSections.map((section) => {
              const hasChildren = !!section.items?.length;
              const open = pathname.startsWith(section.basePath) || !!openSections[section.key];
              return (
                <div key={section.key} className="rounded-xl">
                  <button
                    type="button"
                    onClick={() => hasChildren && setOpenSections((prev) => ({ ...prev, [section.key]: !open }))}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm ${shellClass[theme].muted} ${pathname.startsWith(section.basePath) ? shellClass[theme].active : 'border-transparent'}`}
                  >
                    <div className="flex items-center gap-2">{section.icon}{!collapsed ? <span>{section.label}</span> : null}</div>
                    {!collapsed && hasChildren ? <ChevronDown size={16} className={`transition ${open ? '' : '-rotate-90'}`} /> : null}
                  </button>
                  {hasChildren && open && !collapsed ? (
                    <div className="mt-1 space-y-1 pl-7">
                      {section.items?.map((item) =>
                        item.disabled ? (
                          <span key={item.path} className="block rounded-lg px-3 py-1.5 text-xs text-slate-400">{item.label}</span>
                        ) : (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `block rounded-lg px-3 py-1.5 text-xs ${isActive ? 'bg-indigo-500/15 text-indigo-500' : shellClass[theme].muted}`}
                            onClick={() => setMobileOpen(false)}
                          >
                            {item.label}
                          </NavLink>
                        )
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>
        </aside>

        <div className={`flex-1 ${collapsed ? 'lg:ml-20' : 'lg:ml-72'} transition-all`}>
          <header className="sticky top-0 z-30 border-b border-slate-200/20 bg-inherit/95 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-3 md:px-6">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setMobileOpen(true)} className="rounded-md p-1 lg:hidden"><Menu size={18} /></button>
                <div className="relative">
                  <Search size={16} className="absolute left-2 top-2.5 text-slate-400" />
                  <input placeholder="Search users, scans, content..." className={`${shellClass[theme].input} rounded-lg py-2 pl-8 pr-3 text-sm outline-none`} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button type="button" onClick={toggleTheme} className={`${shellClass[theme].card} rounded-lg p-2`}>{theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}</button>
                <Link to="/dashboard" className="rounded-lg border border-slate-400/30 px-3 py-1.5 text-xs">Main App</Link>
                <button
                  type="button"
                  onClick={() => {
                    logoutAdmin();
                    window.location.href = '/admin/login';
                  }}
                  className="rounded-lg border border-rose-400/30 px-3 py-1.5 text-xs text-rose-400"
                >
                  Logout Admin
                </button>
              </div>
            </div>
          </header>

          <main className="px-4 py-6 md:px-6"><Outlet /></main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
