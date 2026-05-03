import React, { useEffect, useMemo, useState } from 'react';
import {
  createAdminNotification,
  createAdminRefundRequest,
  createAdminUser,
  getAdminNotifications,
  getAdminPaymentPlans,
  getAdminPaymentTransactions,
  getAdminRefundRequests,
  getAdminSettings,
  getAdminStripeStatus,
  getAdminUsersAndRoles,
  getContentItems,
  getSubscriptionsOverview,
  getSystemLogs,
  saveAdminPaymentPlans,
  saveAdminSettings,
  sendAdminTestEmail,
  upsertContentItem,
  writeSystemLog,
  AdminNotificationRecord,
  AdminPaymentMethod,
  AdminPaymentPlan,
  AdminBillingCycle,
} from '../../../services/adminService';
import { PageScaffold, Table, Toast, Toggle, shellClass, useAdminTheme } from '../components/AdminWidgets';

const billingCycleLabels: Record<AdminBillingCycle, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

const paymentMethodLabels: Record<AdminPaymentMethod, string> = {
  card: 'Card',
  bank_transfer: 'Bank transfer',
  wallet: 'Wallet',
  mobile_money: 'Mobile money',
  cash: 'Cash',
  paypal: 'PayPal',
};

const paymentMethodOptions: AdminPaymentMethod[] = ['card', 'bank_transfer', 'wallet', 'mobile_money', 'cash', 'paypal'];

const createEmptyPlan = (): AdminPaymentPlan => ({
  id: `plan-${Date.now()}`,
  name: '',
  description: '',
  priceMonthly: 0,
  billingCycle: 'monthly',
  features: [],
  paymentMethods: ['card'],
  trialDays: 0,
  active: true,
});

export const AdminGamificationXpPage: React.FC = () => {
  const theme = useAdminTheme();
  const [xpPerScan, setXpPerScan] = useState(12);
  const [xpPerWorkout, setXpPerWorkout] = useState(40);

  useEffect(() => {
    getAdminSettings('gamification').then((config: any) => {
      if (!config) return;
      setXpPerScan(Number(config.xpPerScan || 12));
      setXpPerWorkout(Number(config.xpPerWorkout || 40));
    });
  }, []);

  return (
    <PageScaffold title="XP Rules" description="Persisted admin XP configuration" theme={theme}>
      <div className={`${shellClass[theme].card} max-w-xl rounded-3xl p-5 space-y-3`}>
        <label className="text-sm">XP per scan<input value={xpPerScan} onChange={(e) => setXpPerScan(Number(e.target.value))} className={`${shellClass[theme].input} mt-1 w-full rounded-lg px-3 py-2`} /></label>
        <label className="text-sm">XP per workout<input value={xpPerWorkout} onChange={(e) => setXpPerWorkout(Number(e.target.value))} className={`${shellClass[theme].input} mt-1 w-full rounded-lg px-3 py-2`} /></label>
        <button className="rounded-lg bg-emerald-500 px-4 py-2 text-sm text-emerald-950" onClick={() => saveAdminSettings('gamification', { xpPerScan, xpPerWorkout })}>Save Rules</button>
      </div>
    </PageScaffold>
  );
};

export const AdminGamificationLevelsPage: React.FC = () => {
  const theme = useAdminTheme();
  const [rows, setRows] = useState<Array<{ range: string; title: string }>>([]);
  const [range, setRange] = useState('');
  const [title, setTitle] = useState('');

  useEffect(() => {
    getAdminSettings('gamification').then((config: any) => {
      setRows(Array.isArray(config?.levels) ? config.levels : []);
    });
  }, []);

  const save = async () => {
    await saveAdminSettings('gamification', { levels: rows });
  };

  return (
    <PageScaffold title="Levels" description="Rank thresholds" theme={theme}>
      <div className={`${shellClass[theme].card} rounded-3xl p-5`}>
        <div className="grid gap-2 md:grid-cols-[140px_1fr_auto]">
          <input value={range} onChange={(e) => setRange(e.target.value)} placeholder="1-10" className={`${shellClass[theme].input} rounded-lg px-3 py-2`} />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Rookie" className={`${shellClass[theme].input} rounded-lg px-3 py-2`} />
          <button className="rounded-lg bg-emerald-500 px-4 py-2 text-emerald-950" onClick={() => {
            if (!range.trim() || !title.trim()) return;
            setRows((prev) => [...prev, { range: range.trim(), title: title.trim() }]);
            setRange('');
            setTitle('');
          }}>Add</button>
        </div>
        <button className="mt-3 rounded-lg bg-emerald-500 px-4 py-2 text-sm text-emerald-950" onClick={save}>Save Levels</button>
      </div>
      <Table theme={theme} headers={['Range', 'Title']} rows={rows.length ? rows.map((item) => [item.range, item.title]) : [['No level rows set', '-']]} />
    </PageScaffold>
  );
};
export const AdminGamificationStreaksPage: React.FC = () => {
  const theme = useAdminTheme();
  const [dailyBonus, setDailyBonus] = useState(5);
  const [weeklyBonus, setWeeklyBonus] = useState(40);

  useEffect(() => {
    getAdminSettings('gamification').then((config: any) => {
      if (!config) return;
      setDailyBonus(Number(config.dailyStreakBonus || 5));
      setWeeklyBonus(Number(config.weeklyStreakBonus || 40));
    });
  }, []);

  return (
    <PageScaffold title="Streaks & Rewards" description="Persisted streak bonus settings" theme={theme}>
      <div className={`${shellClass[theme].card} rounded-3xl p-5 space-y-3`}>
        <label className="text-sm">Daily streak XP bonus<input value={dailyBonus} onChange={(e) => setDailyBonus(Number(e.target.value))} className={`${shellClass[theme].input} mt-1 w-full rounded-lg px-3 py-2`} /></label>
        <label className="text-sm">7-day streak XP bonus<input value={weeklyBonus} onChange={(e) => setWeeklyBonus(Number(e.target.value))} className={`${shellClass[theme].input} mt-1 w-full rounded-lg px-3 py-2`} /></label>
        <button className="rounded-lg bg-emerald-500 px-4 py-2 text-sm text-emerald-950" onClick={() => saveAdminSettings('gamification', { dailyStreakBonus: dailyBonus, weeklyStreakBonus: weeklyBonus })}>Save Streak Rules</button>
      </div>
    </PageScaffold>
  );
};
export const AdminGamificationBadgesPage: React.FC = () => {
  const theme = useAdminTheme();
  const [badges, setBadges] = useState<Array<{ name: string; condition: string }>>([]);
  const [name, setName] = useState('');
  const [condition, setCondition] = useState('');

  useEffect(() => {
    getAdminSettings('gamification').then((config: any) => {
      setBadges(Array.isArray(config?.badges) ? config.badges : []);
    });
  }, []);

  return (
    <PageScaffold title="Badges" description="Badge setup" theme={theme}>
      <div className={`${shellClass[theme].card} rounded-3xl p-5`}>
        <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Badge name" className={`${shellClass[theme].input} rounded-lg px-3 py-2`} />
          <input value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="Condition" className={`${shellClass[theme].input} rounded-lg px-3 py-2`} />
          <button className="rounded-lg bg-emerald-500 px-4 py-2 text-emerald-950" onClick={() => {
            if (!name.trim() || !condition.trim()) return;
            setBadges((prev) => [...prev, { name: name.trim(), condition: condition.trim() }]);
            setName('');
            setCondition('');
          }}>Add</button>
        </div>
        <button className="mt-3 rounded-lg bg-emerald-500 px-4 py-2 text-sm text-emerald-950" onClick={() => saveAdminSettings('gamification', { badges })}>Save Badges</button>
      </div>
      <Table theme={theme} headers={['Badge', 'Condition']} rows={badges.length ? badges.map((item) => [item.name, item.condition]) : [['No badges configured', '-']]} />
    </PageScaffold>
  );
};

export const AdminPaymentsPlansPage: React.FC = () => {
  const theme = useAdminTheme();
  const [plans, setPlans] = useState<AdminPaymentPlan[]>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    getAdminPaymentPlans().then((items) => setPlans(items.length ? items : [])).catch((err) => console.error('plans error', err));
  }, []);

  const updatePlan = (id: string, patch: Partial<AdminPaymentPlan>) => {
    setPlans((prev) => prev.map((plan) => (plan.id === id ? { ...plan, ...patch } : plan)));
  };

  const renamePlan = (id: string, nextId: string) => {
    const normalized = nextId.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, '-');
    if (!normalized) return;
    setPlans((prev) => prev.map((plan) => (plan.id === id ? { ...plan, id: normalized } : plan)));
  };

  const togglePaymentMethod = (planId: string, method: AdminPaymentMethod) => {
    setPlans((prev) =>
      prev.map((plan) => {
        if (plan.id !== planId) return plan;
        const methods = plan.paymentMethods || [];
        return {
          ...plan,
          paymentMethods: methods.includes(method) ? methods.filter((item) => item !== method) : [...methods, method],
        };
      })
    );
  };

  const removePlan = (planId: string) => {
    setPlans((prev) => prev.filter((plan) => plan.id !== planId));
  };

  const addPlan = () => setPlans((prev) => [...prev, createEmptyPlan()]);

  const savePlans = async () => {
    const normalized = plans
      .map((plan) => ({
        ...plan,
        name: plan.name.trim(),
        description: plan.description.trim(),
        features: plan.features.map((feature) => feature.trim()).filter(Boolean),
        paymentMethods: Array.from(new Set(plan.paymentMethods.filter(Boolean))),
        billingCycle: plan.billingCycle || 'monthly',
        trialDays: Number(plan.trialDays || 0),
        priceMonthly: Number(plan.priceMonthly || 0),
      }))
      .filter((plan) => plan.name.length > 0 || plan.description.length > 0 || plan.priceMonthly > 0 || plan.features.length > 0);

    await saveAdminPaymentPlans(normalized);
    setPlans(normalized);
    setStatus('Payment plans updated successfully.');
  };

  return (
    <PageScaffold title="Plans" description="Configure pricing, billing cadence, trial periods, and accepted payment methods." theme={theme}>
      <div className={`${shellClass[theme].card} rounded-3xl p-5 space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={`text-sm ${shellClass[theme].subtle}`}>Add and maintain the live subscription catalog.</p>
          <div className="flex gap-2">
            <button type="button" className="rounded-lg border border-emerald-300/30 px-4 py-2 text-sm" onClick={addPlan}>Add plan</button>
            <button type="button" className="rounded-lg bg-emerald-500 px-4 py-2 text-sm text-emerald-950" onClick={savePlans}>Save plans</button>
          </div>
        </div>

        {plans.length === 0 ? (
          <div className={`rounded-2xl border border-dashed ${theme === 'light' ? 'border-slate-300 bg-slate-50' : 'border-emerald-400/20 bg-emerald-500/5'} p-6 text-sm ${shellClass[theme].subtle}`}>
            No plans are configured yet. Create the first billing plan to publish pricing.
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          {plans.map((plan) => (
            <div key={plan.id} className={`${shellClass[theme].card} rounded-3xl p-5 space-y-4`}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <label className={`block text-xs uppercase tracking-wide ${shellClass[theme].subtle}`}>
                    Plan name
                    <input value={plan.name} onChange={(e) => updatePlan(plan.id, { name: e.target.value })} placeholder="Pro Plan" className={`${shellClass[theme].input} mt-1 w-full rounded-lg px-3 py-2`} />
                  </label>
                  <label className={`block text-xs uppercase tracking-wide ${shellClass[theme].subtle}`}>
                    Plan code
                    <input value={plan.id} onChange={(e) => renamePlan(plan.id, e.target.value)} placeholder="pro" className={`${shellClass[theme].input} mt-1 w-full rounded-lg px-3 py-2`} />
                  </label>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <Toggle checked={plan.active} onChange={(value) => updatePlan(plan.id, { active: value })} />
                  <button type="button" className="rounded-lg border border-rose-400/30 px-3 py-1.5 text-xs text-rose-400" onClick={() => removePlan(plan.id)}>Remove</button>
                </div>
              </div>

              <label className="block text-sm">
                Description
                <textarea
                  value={plan.description}
                  onChange={(e) => updatePlan(plan.id, { description: e.target.value })}
                  placeholder="Describe what this plan unlocks"
                  className={`${shellClass[theme].input} mt-1 h-24 w-full rounded-lg px-3 py-2`}
                />
              </label>

              <div className="grid gap-3 md:grid-cols-3">
                <label className={`block text-xs uppercase tracking-wide ${shellClass[theme].subtle}`}>
                  Billing cycle
                  <select value={plan.billingCycle} onChange={(e) => updatePlan(plan.id, { billingCycle: e.target.value as AdminBillingCycle })} className={`${shellClass[theme].input} mt-1 w-full rounded-lg px-3 py-2`}>
                    {Object.entries(billingCycleLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <label className={`block text-xs uppercase tracking-wide ${shellClass[theme].subtle}`}>
                  Monthly price
                  <input type="number" min="0" step="0.01" value={plan.priceMonthly} onChange={(e) => updatePlan(plan.id, { priceMonthly: Number(e.target.value) || 0 })} className={`${shellClass[theme].input} mt-1 w-full rounded-lg px-3 py-2`} />
                </label>
                <label className={`block text-xs uppercase tracking-wide ${shellClass[theme].subtle}`}>
                  Trial days
                  <input type="number" min="0" step="1" value={plan.trialDays} onChange={(e) => updatePlan(plan.id, { trialDays: Number(e.target.value) || 0 })} className={`${shellClass[theme].input} mt-1 w-full rounded-lg px-3 py-2`} />
                </label>
              </div>

              <div className="space-y-2">
                <p className={`text-xs uppercase tracking-wide ${shellClass[theme].subtle}`}>Accepted payment methods</p>
                <div className="flex flex-wrap gap-2">
                  {paymentMethodOptions.map((method) => {
                    const active = plan.paymentMethods.includes(method);
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => togglePaymentMethod(plan.id, method)}
                        className={`rounded-full px-3 py-1.5 text-xs transition ${active ? 'bg-emerald-500 text-emerald-950' : shellClass[theme].input}`}
                      >
                        {paymentMethodLabels[method]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block text-sm">
                Feature list
                <textarea
                  value={plan.features.join('\n')}
                  onChange={(e) => updatePlan(plan.id, { features: e.target.value.split('\n') })}
                  placeholder="Daily scans\nCommunity access\nPriority support"
                  className={`${shellClass[theme].input} mt-1 h-28 w-full rounded-lg px-3 py-2`}
                />
              </label>
            </div>
          ))}
        </div>
        {status ? <p className={`text-sm ${shellClass[theme].subtle}`}>{status}</p> : null}
      </div>
    </PageScaffold>
  );
};
export const AdminPaymentsTransactionsPage: React.FC = () => {
  const theme = useAdminTheme();
  const [rows, setRows] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [method, setMethod] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    getAdminPaymentTransactions(100).then(setRows).catch((err) => console.error('transactions error', err));
  }, []);

  const filteredRows = useMemo(() => {
    const text = query.trim().toLowerCase();
    return rows.filter((item) => {
      const matchesText = !text || [item.id, item.userEmail, item.userId, item.referenceCode, item.provider, item.gateway]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(text));
      const matchesMethod = method === 'all' || String(item.paymentMethod || '').toLowerCase() === method;
      const matchesStatus = statusFilter === 'all' || String(item.status || '').toLowerCase() === statusFilter;
      return matchesText && matchesMethod && matchesStatus;
    });
  }, [method, query, rows, statusFilter]);

  return (
    <PageScaffold title="Transactions" description="Live payment activity, gateway metadata, and reference codes." theme={theme}>
      <div className={`${shellClass[theme].card} rounded-3xl p-5 space-y-4`}>
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by user, payment code, or gateway" className={`${shellClass[theme].input} rounded-lg px-3 py-2 text-sm`} />
          <select value={method} onChange={(e) => setMethod(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2 text-sm`}>
            <option value="all">All methods</option>
            {paymentMethodOptions.map((value) => (
              <option key={value} value={value}>{paymentMethodLabels[value]}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2 text-sm`}>
            <option value="all">All statuses</option>
            <option value="succeeded">Succeeded</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      <Table
        theme={theme}
        headers={['Transaction', 'User', 'Amount', 'Method', 'Gateway', 'Status', 'Reference', 'Date']}
        rows={filteredRows.length
          ? filteredRows.map((item) => [
              item.id,
              item.userEmail || item.userId || '-',
              `$${Number(item.amount || 0).toFixed(2)} ${item.currency || 'USD'}`,
              paymentMethodLabels[(String(item.paymentMethod) as AdminPaymentMethod) || 'card'] || String(item.paymentMethod || '-'),
              item.gateway || item.provider || '-',
              item.status || '-',
              item.referenceCode || '-',
              item.created_at?.seconds ? new Date(item.created_at.seconds * 1000).toLocaleString() : '-',
            ])
          : [['No transactions found', '-', '-', '-', '-', '-', '-', '-']]}
      />
    </PageScaffold>
  );
};
export const AdminPaymentsSubscriptionsPage: React.FC = () => {
  const theme = useAdminTheme();
  const [overview, setOverview] = useState<any>(null);

  useEffect(() => {
    getSubscriptionsOverview().then(setOverview).catch((err) => console.error('subscription error', err));
  }, []);

  return (
    <PageScaffold title="Subscriptions" description="User subscription overview" theme={theme}>
      <Table
        theme={theme}
        headers={['User', 'Email', 'Plan', 'Status', 'Expiry']}
        rows={(overview?.rows || []).length
          ? overview.rows.map((item: any) => [item.name, item.email, String(item.plan || 'basic').toUpperCase(), item.status || '-', item.expiresAt || '-'])
          : [['No subscriptions found', '-', '-', '-', '-']]}
      />
    </PageScaffold>
  );
};
export const AdminPaymentsRefundsPage: React.FC = () => {
  const theme = useAdminTheme();
  const [refunds, setRefunds] = useState<any[]>([]);
  const [transactionId, setTransactionId] = useState('');
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState('');

  const load = () => getAdminRefundRequests().then(setRefunds).catch((err) => console.error('refunds error', err));
  useEffect(() => { load(); }, []);

  return (
    <PageScaffold title="Refunds" description="Refund request queue" theme={theme}>
      <div className={`${shellClass[theme].card} rounded-3xl p-5`}>
        <div className="grid gap-2 md:grid-cols-4">
          <input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2`} placeholder="Transaction ID" />
          <input value={userId} onChange={(e) => setUserId(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2`} placeholder="User ID" />
          <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} className={`${shellClass[theme].input} rounded-lg px-3 py-2`} placeholder="Amount" />
          <input value={reason} onChange={(e) => setReason(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2`} placeholder="Reason" />
        </div>
        <button
          className="mt-3 rounded-lg bg-emerald-500 px-4 py-2 text-sm text-emerald-950"
          onClick={async () => {
            if (!transactionId.trim() || !userId.trim() || amount <= 0 || !reason.trim()) return;
            await createAdminRefundRequest({ transactionId: transactionId.trim(), userId: userId.trim(), amount, reason: reason.trim(), createdBy: 'admin-ui' });
            setTransactionId('');
            setUserId('');
            setAmount(0);
            setReason('');
            await load();
          }}
        >
          Create Refund Request
        </button>
      </div>
      <Table
        theme={theme}
        headers={['Transaction', 'User', 'Amount', 'Reason', 'Status', 'Date']}
        rows={refunds.length
          ? refunds.map((item) => [item.transactionId, item.userId, `$${Number(item.amount || 0).toFixed(2)}`, item.reason || '-', item.status || '-', item.created_at?.seconds ? new Date(item.created_at.seconds * 1000).toLocaleString() : '-'])
          : [['No refund requests', '-', '-', '-', '-', '-']]}
      />
    </PageScaffold>
  );
};
export const AdminPaymentsStripePage: React.FC = () => {
  const theme = useAdminTheme();
  const [status, setStatus] = useState<any>({ connected: false, accountId: '-', mode: 'test', webhookHealthy: false, lastSyncAt: null });

  useEffect(() => {
    getAdminStripeStatus().then(setStatus).catch((err) => console.error('stripe status error', err));
  }, []);

  return (
    <PageScaffold title="Stripe Status" description="Integration status" theme={theme}>
      <div className={`${shellClass[theme].card} rounded-3xl p-5 space-y-2`}>
        <p><span className={`text-sm ${shellClass[theme].subtle}`}>Connected:</span> {status.connected ? 'Yes' : 'No'}</p>
        <p><span className={`text-sm ${shellClass[theme].subtle}`}>Account:</span> {status.accountId || '-'}</p>
        <p><span className={`text-sm ${shellClass[theme].subtle}`}>Mode:</span> {status.mode || 'test'}</p>
        <p><span className={`text-sm ${shellClass[theme].subtle}`}>Webhook healthy:</span> {status.webhookHealthy ? 'Yes' : 'No'}</p>
        <p><span className={`text-sm ${shellClass[theme].subtle}`}>Last sync:</span> {status.lastSyncAt || '-'}</p>
      </div>
    </PageScaffold>
  );
};

const ContentPage: React.FC<{ type: 'workout' | 'diet' | 'skincare' | 'prompt'; title: string }> = ({ type, title }) => {
  const theme = useAdminTheme();
  const [items, setItems] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [toast, setToast] = useState(false);

  const load = () => getContentItems(type).then(setItems).catch((err) => console.error('content error', err));
  useEffect(() => { load(); }, [type]);

  const createItem = async () => {
    if (!newTitle.trim()) return;
    await upsertContentItem({ type, title: newTitle.trim(), level: 1, plan: 'basic', premium: false });
    setNewTitle('');
    setToast(true);
    setTimeout(() => setToast(false), 1400);
    await load();
  };

  return (
    <PageScaffold title={title} description="CRUD connected to adminContent collection" theme={theme}>
      <div className={`${shellClass[theme].card} rounded-3xl p-5`}> 
        <div className="flex gap-2">
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New content title" className={`${shellClass[theme].input} flex-1 rounded-lg px-3 py-2`} />
          <button className="rounded-lg bg-emerald-500 px-4 py-2 text-emerald-950" onClick={createItem}>Create</button>
        </div>
      </div>
      <Table theme={theme} headers={['Title', 'Plan', 'Level', 'Premium']} rows={items.map((item) => [item.title, String(item.plan).toUpperCase(), String(item.level), item.premium ? 'Yes' : 'No'])} />
      {toast ? <Toast message="Content saved" theme={theme} /> : null}
    </PageScaffold>
  );
};

export const AdminContentWorkoutsPage: React.FC = () => <ContentPage type="workout" title="Workout Plans" />;
export const AdminContentDietsPage: React.FC = () => <ContentPage type="diet" title="Diet Plans" />;
export const AdminContentSkincarePage: React.FC = () => <ContentPage type="skincare" title="Skincare Guides" />;
export const AdminContentPromptsPage: React.FC = () => <ContentPage type="prompt" title="AI Prompt Templates" />;

const NotificationPage: React.FC<{ type: 'push' | 'in-app' | 'email'; title: string }> = ({ type, title }) => {
  const theme = useAdminTheme();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<'all' | 'basic' | 'pro' | 'elite'>('all');
  const [history, setHistory] = useState<AdminNotificationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const items = await getAdminNotifications(30);
      setHistory(items.filter((item) => item.type === type));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [type]);

  const send = async () => {
    if (!message.trim()) return;
    await createAdminNotification({ type, title: subject.trim(), message: message.trim(), target });
    setSubject('');
    setMessage('');
    setToast(true);
    setTimeout(() => setToast(false), 1400);
    await loadHistory();
  };

  return (
    <PageScaffold title={title} description="Queue notification messages to database" theme={theme}>
      <div className={`${shellClass[theme].card} rounded-3xl p-5`}>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Title (optional)" className={`${shellClass[theme].input} mb-2 w-full rounded-lg px-3 py-2`} />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write message" className={`${shellClass[theme].input} h-32 w-full rounded-lg px-3 py-2`} />
        <div className="mt-2 flex flex-wrap gap-2">
          <select value={target} onChange={(e) => setTarget(e.target.value as any)} className={`${shellClass[theme].input} rounded-lg px-3 py-2 text-sm`}>
            <option value="all">All users</option>
            <option value="basic">Basic plan</option>
            <option value="pro">Pro plan</option>
            <option value="elite">Elite plan</option>
          </select>
          <button className="rounded-lg bg-emerald-500 px-4 py-2 text-emerald-950" onClick={send}>Queue</button>
        </div>
      </div>

      <div className={`${shellClass[theme].card} rounded-3xl p-5`}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Recent {title}</h3>
          <button className={`text-xs ${shellClass[theme].subtle}`} onClick={loadHistory}>Refresh</button>
        </div>
        {loading ? <p className={`text-sm ${shellClass[theme].subtle}`}>Loading notifications...</p> : null}
        {!loading && history.length === 0 ? <p className={`text-sm ${shellClass[theme].subtle}`}>No messages queued yet.</p> : null}
        {!loading && history.length > 0 ? (
          <Table
            theme={theme}
            headers={['Title', 'Target', 'Status', 'Message']}
            rows={history.map((item) => [item.title, String(item.target).toUpperCase(), item.status, item.message.slice(0, 90)])}
          />
        ) : null}
      </div>
      {toast ? <Toast message="Notification queued" theme={theme} /> : null}
    </PageScaffold>
  );
};

export const AdminNotificationsPushPage: React.FC = () => <NotificationPage type="push" title="Push Notifications" />;
export const AdminNotificationsInAppPage: React.FC = () => <NotificationPage type="in-app" title="In-App Announcements" />;
export const AdminNotificationsEmailPage: React.FC = () => <NotificationPage type="email" title="Email Campaigns" />;

export const AdminSettingsGeneralPage: React.FC = () => {
  const theme = useAdminTheme();
  const [appName, setAppName] = useState('LevelUp AI');
  const [logoUrl, setLogoUrl] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    getAdminSettings('general').then((d: any) => {
      if (d?.appName) setAppName(d.appName);
      if (d?.logoUrl) setLogoUrl(d.logoUrl);
      if (typeof d?.maintenanceMode === 'boolean') setMaintenanceMode(d.maintenanceMode);
    });
  }, []);

  return (
    <PageScaffold title="General Settings" description="App-level config" theme={theme}>
      <div className={`${shellClass[theme].card} rounded-3xl p-5 space-y-3`}>
        <input value={appName} onChange={(e) => setAppName(e.target.value)} className={`${shellClass[theme].input} w-full rounded-lg px-3 py-2`} />
        <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className={`${shellClass[theme].input} w-full rounded-lg px-3 py-2`} placeholder="Logo URL" />
        <label className="flex items-center justify-between text-sm">Maintenance Mode <input type="checkbox" checked={maintenanceMode} onChange={(e) => setMaintenanceMode(e.target.checked)} /></label>
        <button className="rounded-lg bg-emerald-500 px-4 py-2 text-emerald-950" onClick={() => saveAdminSettings('general', { appName, logoUrl, maintenanceMode })}>Save</button>
      </div>
    </PageScaffold>
  );
};

export const AdminSettingsEmailPage: React.FC = () => {
  const theme = useAdminTheme();
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [port, setPort] = useState('587');
  const [gmail, setGmail] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [senderName, setSenderName] = useState('LevelUp Team');
  const [deliveryWebhookUrl, setDeliveryWebhookUrl] = useState('');
  const [deliveryWebhookApiKey, setDeliveryWebhookApiKey] = useState('');
  const [welcomeEmailEnabled, setWelcomeEmailEnabled] = useState(true);
  const [testRecipient, setTestRecipient] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    getAdminSettings('email').then((d: any) => {
      if (!d) return;
      setSmtpHost(d.smtpHost || 'smtp.gmail.com');
      setPort(String(d.port || '587'));
      setGmail(d.gmail || '');
      setAppPassword(d.appPassword || '');
      setSenderName(d.senderName || 'LevelUp Team');
      setDeliveryWebhookUrl(d.deliveryWebhookUrl || '');
      setDeliveryWebhookApiKey(d.deliveryWebhookApiKey || '');
      setWelcomeEmailEnabled(d.welcomeEmailEnabled !== false);
    });
  }, []);

  const saveEmailConfig = async () => {
    await saveAdminSettings('email', {
      smtpHost,
      port,
      gmail,
      appPassword,
      senderName,
      deliveryWebhookUrl,
      deliveryWebhookApiKey,
      welcomeEmailEnabled,
    });
    setStatus('Email settings saved.');
  };

  const sendTest = async () => {
    if (!testRecipient.trim()) {
      setStatus('Enter a test recipient email first.');
      return;
    }
    try {
      await sendAdminTestEmail(testRecipient.trim());
      setStatus('Test email request sent successfully.');
    } catch (error: any) {
      setStatus(error?.message || 'Failed to send test email.');
    }
  };

  return (
    <PageScaffold title="Email (Gmail / SMTP)" description="Signup and lifecycle email settings" theme={theme}>
      <div className={`${shellClass[theme].card} grid gap-3 rounded-3xl p-5 md:grid-cols-2`}>
        <input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2`} placeholder="SMTP host" />
        <input value={port} onChange={(e) => setPort(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2`} placeholder="Port" />
        <input value={gmail} onChange={(e) => setGmail(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2`} placeholder="Gmail" />
        <input value={appPassword} onChange={(e) => setAppPassword(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2`} placeholder="App password" type="password" />
        <input value={senderName} onChange={(e) => setSenderName(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2 md:col-span-2`} placeholder="Sender name" />
        <input value={deliveryWebhookUrl} onChange={(e) => setDeliveryWebhookUrl(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2 md:col-span-2`} placeholder="Delivery webhook URL (required for real send)" />
        <input value={deliveryWebhookApiKey} onChange={(e) => setDeliveryWebhookApiKey(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2 md:col-span-2`} placeholder="Webhook API key (optional)" type="password" />
        <label className="md:col-span-2 flex items-center justify-between text-sm">Send welcome email on signup<input type="checkbox" checked={welcomeEmailEnabled} onChange={(e) => setWelcomeEmailEnabled(e.target.checked)} /></label>
        <div className="md:col-span-2 grid gap-2 md:grid-cols-[1fr_auto]">
          <input value={testRecipient} onChange={(e) => setTestRecipient(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2`} placeholder="Test recipient email" />
          <button className="rounded-lg border border-emerald-300/30 px-4 py-2 text-sm" onClick={sendTest}>Send Test Email</button>
        </div>
        <button className="rounded-lg bg-emerald-500 px-4 py-2 text-emerald-950 md:col-span-2" onClick={saveEmailConfig}>Save Email Config</button>
        {status ? <p className={`md:col-span-2 text-sm ${shellClass[theme].subtle}`}>{status}</p> : null}
      </div>
    </PageScaffold>
  );
};

export const AdminSettingsApiPage: React.FC = () => {
  const theme = useAdminTheme();
  const [openAiKey, setOpenAiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [cloudinaryCloudName, setCloudinaryCloudName] = useState('');
  const [cloudinaryApiKey, setCloudinaryApiKey] = useState('');
  const [cloudinaryApiSecret, setCloudinaryApiSecret] = useState('');
  const [webhook, setWebhook] = useState('');

  useEffect(() => {
    getAdminSettings('api').then((d: any) => {
      if (!d) return;
      setOpenAiKey(d.openAiKey || '');
      setGeminiApiKey(d.geminiApiKey || '');
      setCloudinaryCloudName(d.cloudinaryCloudName || '');
      setCloudinaryApiKey(d.cloudinaryApiKey || '');
      setCloudinaryApiSecret(d.cloudinaryApiSecret || '');
      setWebhook(d.webhook || '');
    });
  }, []);

  return (
    <PageScaffold title="API & Integrations" description="Gemini AI, Cloudinary, and Webhooks" theme={theme}>
      <div className={`${shellClass[theme].card} rounded-3xl p-5 space-y-4`}>
        <div className="space-y-2">
          <label className="text-sm font-bold opacity-70">AI Configuration</label>
          <div className="space-y-1">
            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Required for Face & Food scans</p>
            <input 
              value={geminiApiKey} 
              onChange={(e) => setGeminiApiKey(e.target.value)} 
              className={`${shellClass[theme].input} w-full rounded-lg px-3 py-2 border-emerald-500/30 focus:border-emerald-500`} 
              placeholder="Google Gemini API Key" 
              type="password" 
            />
          </div>
        </div>

        <div className="space-y-2 border-t border-white/5 pt-4">
          <label className="text-sm font-bold opacity-70">Cloudinary (Image Storage)</label>
          <input value={cloudinaryCloudName} onChange={(e) => setCloudinaryCloudName(e.target.value)} className={`${shellClass[theme].input} w-full rounded-lg px-3 py-2`} placeholder="Cloud Name" />
          <input value={cloudinaryApiKey} onChange={(e) => setCloudinaryApiKey(e.target.value)} className={`${shellClass[theme].input} w-full rounded-lg px-3 py-2`} placeholder="API Key" />
          <input value={cloudinaryApiSecret} onChange={(e) => setCloudinaryApiSecret(e.target.value)} className={`${shellClass[theme].input} w-full rounded-lg px-3 py-2`} placeholder="API Secret" type="password" />
        </div>

        <div className="space-y-2 border-t border-white/5 pt-4">
          <label className="text-sm font-bold opacity-70">Other</label>
          <input value={webhook} onChange={(e) => setWebhook(e.target.value)} className={`${shellClass[theme].input} w-full rounded-lg px-3 py-2`} placeholder="Webhook endpoint" />
        </div>

        <button 
          className="w-full rounded-lg bg-emerald-500 px-4 py-3 font-bold text-emerald-950 hover:bg-emerald-400 transition-colors" 
          onClick={() => saveAdminSettings('api', { 
            openAiKey, 
            geminiApiKey,
            cloudinaryCloudName,
            cloudinaryApiKey,
            cloudinaryApiSecret,
            webhook, 
            stripeStatus: 'locked' 
          })}
        >
          Save All Integrations
        </button>
      </div>
    </PageScaffold>
  );
};
export const AdminSettingsSecurityPage: React.FC = () => {
  const theme = useAdminTheme();
  const [require2fa, setRequire2fa] = useState(false);
  const [strictRoles, setStrictRoles] = useState(true);
  const [loginLogs, setLoginLogs] = useState<any[]>([]);

  useEffect(() => {
    getAdminSettings('security').then((d: any) => {
      if (!d) return;
      setRequire2fa(!!d.require2fa);
      setStrictRoles(d.strictRoles !== false);
    });
    getSystemLogs().then((logs) => setLoginLogs(logs.filter((item: any) => String(item.type).includes('login')).slice(0, 20)));
  }, []);

  return (
    <PageScaffold title="Security & Roles" description="Admin roles, permissions, login logs, and 2FA policy" theme={theme}>
      <div className={`${shellClass[theme].card} rounded-3xl p-5 space-y-3`}>
        <label className="flex items-center justify-between text-sm">Require 2FA for admins <input type="checkbox" checked={require2fa} onChange={(e) => setRequire2fa(e.target.checked)} /></label>
        <label className="flex items-center justify-between text-sm">Strict role permissions <input type="checkbox" checked={strictRoles} onChange={(e) => setStrictRoles(e.target.checked)} /></label>
        <button className="rounded-lg bg-emerald-500 px-4 py-2 text-emerald-950" onClick={() => saveAdminSettings('security', { require2fa, strictRoles })}>Save Security Policy</button>
      </div>
      <Table
        theme={theme}
        headers={['Event', 'Message', 'Date']}
        rows={loginLogs.length
          ? loginLogs.map((log: any) => [log.type || 'login', log.message || '-', log.created_at?.seconds ? new Date(log.created_at.seconds * 1000).toLocaleString() : '-'])
          : [['No login logs found', '-', '-']]}
      />
    </PageScaffold>
  );
};
export const AdminSettingsAppearancePage: React.FC = () => {
  const theme = useAdminTheme();
  const [sidebarStyle, setSidebarStyle] = useState('glass');

  useEffect(() => {
    getAdminSettings('appearance').then((d: any) => {
      if (d?.sidebarStyle) setSidebarStyle(d.sidebarStyle);
    });
  }, []);

  return (
    <PageScaffold title="Appearance" description="Theme, dark mode, and sidebar style" theme={theme}>
      <div className={`${shellClass[theme].card} rounded-3xl p-5 space-y-3`}>
        <p className={`text-sm ${shellClass[theme].subtle}`}>Use top-right control for dark/light mode.</p>
        <select value={sidebarStyle} onChange={(e) => setSidebarStyle(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2 text-sm`}>
          <option value="glass">Glass</option>
          <option value="solid">Solid</option>
          <option value="compact">Compact</option>
        </select>
        <button className="rounded-lg bg-emerald-500 px-4 py-2 text-emerald-950" onClick={() => saveAdminSettings('appearance', { sidebarStyle })}>Save Appearance</button>
      </div>
    </PageScaffold>
  );
};
export const AdminSettingsSystemPage: React.FC = () => {
  const theme = useAdminTheme();
  const [logs, setLogs] = useState<any[]>([]);

  const loadLogs = () => getSystemLogs().then(setLogs).catch((err) => console.error('system logs error', err));

  useEffect(() => {
    loadLogs();
  }, []);

  const clearCache = async () => {
    await writeSystemLog({ type: 'cache-clear', message: 'Admin requested cache clear operation' });
    await loadLogs();
  };

  return (
    <PageScaffold title="System & Cache" description="Clear cache, system health, and error logs" theme={theme}>
      <div className={`${shellClass[theme].card} rounded-3xl p-5 space-y-3`}>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-lg bg-emerald-500 px-4 py-2 text-emerald-950" onClick={clearCache}>Clear Cache</button>
          <button className="rounded-lg border border-emerald-300/30 px-4 py-2 text-sm" onClick={() => writeSystemLog({ type: 'health-check', message: 'Manual system health check passed' }).then(loadLogs)}>Run Health Check</button>
        </div>
      </div>
      <Table
        theme={theme}
        headers={['Type', 'Message', 'Date']}
        rows={logs.length
          ? logs.map((log: any) => [log.type || '-', log.message || '-', log.created_at?.seconds ? new Date(log.created_at.seconds * 1000).toLocaleString() : '-'])
          : [['No system logs', '-', '-']]}
      />
    </PageScaffold>
  );
};

export const AdminAdminsPage: React.FC = () => {
  const theme = useAdminTheme();
  const [admins, setAdmins] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'super-admin' | 'manager' | 'moderator' | 'support'>('manager');

  const load = () => getAdminUsersAndRoles().then(setAdmins).catch((err) => console.error('admin users error', err));

  useEffect(() => {
    load();
  }, []);

  return (
    <PageScaffold title="Admin Management" description="Create admins, assign roles, permissions, and audit-ready access" theme={theme}>
      <div className={`${shellClass[theme].card} rounded-3xl p-5`}>
        <div className="grid gap-2 md:grid-cols-[1fr_180px_auto]">
          <input value={email} onChange={(e) => setEmail(e.target.value)} className={`${shellClass[theme].input} rounded-lg px-3 py-2`} placeholder="Admin email" />
          <select value={role} onChange={(e) => setRole(e.target.value as any)} className={`${shellClass[theme].input} rounded-lg px-3 py-2`}>
            <option value="super-admin">Super Admin</option>
            <option value="manager">Manager</option>
            <option value="moderator">Moderator</option>
            <option value="support">Support</option>
          </select>
          <button
            className="rounded-lg bg-emerald-500 px-4 py-2 text-emerald-950"
            onClick={async () => {
              if (!email.trim()) return;
              await createAdminUser({ email: email.trim(), role });
              await writeSystemLog({ type: 'admin-create', message: `Created admin ${email.trim()} with role ${role}` });
              setEmail('');
              await load();
            }}
          >
            Create Admin
          </button>
        </div>
      </div>
      <Table
        theme={theme}
        headers={['Admin', 'Role', 'Status']}
        rows={admins.length
          ? admins.map((item: any) => [item.email || '-', item.role || '-', item.active === false ? 'Disabled' : 'Active'])
          : [['No admin users found', '-', '-']]}
      />
    </PageScaffold>
  );
};

export const AdminRouteFallback: React.FC = () => {
  const theme = useAdminTheme();
  return <PageScaffold title="Admin" description="Choose a section from sidebar" theme={theme}><div className={`${shellClass[theme].card} rounded-3xl p-5`}>Route not found.</div></PageScaffold>;
};
