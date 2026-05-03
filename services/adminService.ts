import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  addDoc,
  deleteDoc,
} from 'firebase/firestore';
import { firestore } from '../config/firebase';
import { BodyScan, FaceScan, Group, NutritionScan, Post, UserProfile } from '../types';

export type ScannerType = 'food' | 'body' | 'face';

export type AdminDashboardMetrics = {
  totalUsers: number;
  active24h: number;
  active7d: number;
  totalScans: number;
  totalRevenue: number;
  subscriptionBreakdown: { basic: number; pro: number; elite: number };
  xpSeries: number[];
};

export type AdminPaymentMethod = 'card' | 'bank_transfer' | 'wallet' | 'mobile_money' | 'cash' | 'paypal';

export type AdminBillingCycle = 'monthly' | 'quarterly' | 'yearly';

export type AdminNotificationType = 'push' | 'in-app' | 'email';

export type AdminNotificationRecord = {
  id: string;
  type: AdminNotificationType;
  title: string;
  message: string;
  target: 'all' | 'basic' | 'pro' | 'elite';
  status: 'queued' | 'sent' | 'failed' | 'read';
  read: boolean;
  created_at?: any;
  updated_at?: any;
};

export type AdminUserRecord = {
  email: string;
  uid?: string;
  role: 'super-admin' | 'manager' | 'moderator' | 'support';
  active: boolean;
  created_at?: any;
  updated_at?: any;
};

export type AdminEmailSettings = {
  method?: 'smtp' | 'mailgun' | 'sendgrid';
  encryption?: 'ssl' | 'tls' | 'none';
  smtpHost?: string;
  port?: string;
  gmail?: string;
  appPassword?: string;
  senderName?: string;
  senderEmail?: string;
  deliveryWebhookUrl?: string;
  deliveryWebhookApiKey?: string;
  welcomeEmailEnabled?: boolean;
};

export type AdminEmailTemplateVariable = {
  key: string;
  description: string;
};

export type AdminEmailTemplate = {
  id?: string;
  key: string;
  name: string;
  subject: string;
  body: string;
  status: 'active' | 'inactive';
  variables: AdminEmailTemplateVariable[];
  created_at?: any;
  updated_at?: any;
};

export type AdminPaymentPlan = {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  billingCycle: AdminBillingCycle;
  features: string[];
  paymentMethods: AdminPaymentMethod[];
  trialDays: number;
  active: boolean;
};

export type AdminPaymentTransaction = {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: AdminPaymentMethod | string;
  provider: string;
  gateway: string;
  referenceCode: string;
  planId?: string;
  created_at?: any;
};

export type AdminRefundRequest = {
  id: string;
  transactionId: string;
  userId: string;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_by: string;
  created_at?: any;
  updated_at?: any;
};

export type CommunityReportRecord = {
  id: string;
  targetType: 'post' | 'comment' | 'group' | 'user';
  targetId: string;
  reportedBy: string;
  reason: string;
  status: 'open' | 'resolved' | 'dismissed';
  resolution?: string;
  created_at?: any;
  updated_at?: any;
};

const toMillis = (value: any): number => {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value === 'string') {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? 0 : ms;
  }
  if (value?.seconds) return value.seconds * 1000;
  return 0;
};

export const getDashboardMetrics = async (): Promise<AdminDashboardMetrics> => {
  const [usersSnap, foodSnap, bodySnap, faceSnap, paymentsSnap] = await Promise.all([
    getDocs(collection(firestore, 'users')),
    getDocs(collection(firestore, 'nutritionScans')),
    getDocs(collection(firestore, 'bodyScans')),
    getDocs(collection(firestore, 'faceScans')),
    getDocs(collection(firestore, 'payments')),
  ]);

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const week = 7 * day;

  let active24h = 0;
  let active7d = 0;
  const planCount = { basic: 0, pro: 0, elite: 0 };

  usersSnap.docs.forEach((userDoc) => {
    const data = userDoc.data() as any;
    const lastActive = toMillis(data.last_active || data.updated_at || data.created_at);
    if (lastActive >= now - day) active24h += 1;
    if (lastActive >= now - week) active7d += 1;

    const plan = String(data.plan || data.subscription_plan || 'basic').toLowerCase();
    if (plan === 'elite') planCount.elite += 1;
    else if (plan === 'pro') planCount.pro += 1;
    else planCount.basic += 1;
  });

  const xpSeries = [0, 0, 0, 0, 0, 0, 0];
  usersSnap.docs.forEach((userDoc) => {
    const data = userDoc.data() as any;
    const created = toMillis(data.created_at);
    if (!created) return;
    const daysAgo = Math.floor((now - created) / day);
    if (daysAgo >= 0 && daysAgo < 7) {
      const slot = 6 - daysAgo;
      xpSeries[slot] += Number(data.xp || 0);
    }
  });

  const totalRevenue = paymentsSnap.docs.reduce((sum, paymentDoc) => {
    const data = paymentDoc.data() as any;
    return sum + Number(data.amount || 0);
  }, 0);

  return {
    totalUsers: usersSnap.size,
    active24h,
    active7d,
    totalScans: foodSnap.size + bodySnap.size + faceSnap.size,
    totalRevenue,
    subscriptionBreakdown: planCount,
    xpSeries,
  };
};

export const getUserLevelInsights = async () => {
  const users = await getAdminUsers();
  const sorted = [...users].sort((a: any, b: any) => Number(b.xp || 0) - Number(a.xp || 0));

  const avgLevel = users.length
    ? users.reduce((acc, user: any) => acc + Number(user.level || 1), 0) / users.length
    : 0;

  const abuseCandidates = users
    .filter((user: any) => {
      const xp = Number(user.xp || 0);
      const level = Number(user.level || 1);
      return xp > 3000 || level > 60 || xp / Math.max(level, 1) > 180;
    })
    .map((user: any) => ({
      id: user.id,
      name: user.display_name || user.email || 'Unknown',
      level: Number(user.level || 1),
      xp: Number(user.xp || 0),
    }));

  return {
    totalUsers: users.length,
    averageLevel: Number(avgLevel.toFixed(1)),
    topUsers: sorted.slice(0, 12),
    abuseCandidates,
  };
};

export const getSubscriptionsOverview = async () => {
  const users = await getAdminUsers();

  const rows = users.map((user: any) => {
    const expiresAt = user.subscription_expires_at || user.plan_expires_at || null;
    const status = user.status || 'active';
    return {
      id: user.id,
      name: user.display_name || user.email || 'Unknown',
      email: user.email || '-',
      plan: String(user.plan || 'basic').toLowerCase(),
      status,
      expiresAt,
    };
  });

  return {
    rows,
    counts: {
      basic: rows.filter((item) => item.plan === 'basic').length,
      pro: rows.filter((item) => item.plan === 'pro').length,
      elite: rows.filter((item) => item.plan === 'elite').length,
    },
  };
};

export const getAdminPaymentPlans = async (): Promise<AdminPaymentPlan[]> => {
  const settings = (await getAdminSettings('billingPlans')) as { plans?: AdminPaymentPlan[] } | null;
  if (!settings?.plans?.length) return [];

  return settings.plans.map((plan, index) => ({
    id: String(plan.id || `plan-${index + 1}`),
    name: plan.name || 'Untitled plan',
    description: plan.description || '',
    priceMonthly: Number(plan.priceMonthly || 0),
    billingCycle: plan.billingCycle || 'monthly',
    features: Array.isArray(plan.features) ? plan.features.map((feature) => String(feature).trim()).filter(Boolean) : [],
    paymentMethods: Array.isArray(plan.paymentMethods)
      ? plan.paymentMethods.filter((method): method is AdminPaymentMethod => ['card', 'bank_transfer', 'wallet', 'mobile_money', 'cash', 'paypal'].includes(String(method)))
      : ['card'],
    trialDays: Number(plan.trialDays || 0),
    active: plan.active !== false,
  }));
};

export const saveAdminPaymentPlans = async (plans: AdminPaymentPlan[]) => {
  await saveAdminSettings('billingPlans', { plans, updated_at: serverTimestamp() });
};

export const getAdminPaymentTransactions = async (max = 80): Promise<AdminPaymentTransaction[]> => {
  const snap = await getDocs(query(collection(firestore, 'payments'), orderBy('created_at', 'desc'), limit(max)));
  return snap.docs.map((item) => {
    const data = item.data() as any;
    return {
      id: item.id,
      userId: data.userId || data.user_id || '-',
      userEmail: data.userEmail || data.email || '-',
      amount: Number(data.amount || 0),
      currency: data.currency || 'USD',
      status: data.status || 'unknown',
      paymentMethod: data.paymentMethod || data.payment_method || data.method || 'card',
      provider: data.provider || data.gateway || 'stripe',
      gateway: data.gateway || data.provider || 'stripe',
      referenceCode: data.referenceCode || data.reference_code || data.code || data.transactionCode || item.id,
      planId: data.planId || data.plan || data.subscription_plan,
      created_at: data.created_at,
    };
  });
};

export const getAdminRefundRequests = async (max = 80): Promise<AdminRefundRequest[]> => {
  const snap = await getDocs(query(collection(firestore, 'adminRefundRequests'), orderBy('created_at', 'desc'), limit(max)));
  return snap.docs.map((item) => {
    const data = item.data() as any;
    return {
      id: item.id,
      transactionId: data.transactionId || '-',
      userId: data.userId || '-',
      amount: Number(data.amount || 0),
      reason: data.reason || '-',
      status: data.status || 'pending',
      created_by: data.created_by || '-',
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  });
};

export const createAdminRefundRequest = async (payload: {
  transactionId: string;
  userId: string;
  amount: number;
  reason: string;
  createdBy: string;
}) => {
  const ref = await addDoc(collection(firestore, 'adminRefundRequests'), {
    transactionId: payload.transactionId,
    userId: payload.userId,
    amount: payload.amount,
    reason: payload.reason,
    status: 'pending',
    created_by: payload.createdBy,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  await writeSystemLog({
    type: 'refund-request',
    message: `Refund request created for transaction ${payload.transactionId}`,
    meta: { refundId: ref.id, amount: payload.amount },
  });

  return ref.id;
};

export const getAdminStripeStatus = async () => {
  const settings = (await getAdminSettings('api')) as any;
  const gateway = settings?.paymentGateway || {};
  return {
    connected: gateway.enabled ?? settings?.stripeConnected === true,
    accountId: gateway.merchantCode || settings?.stripeAccountId || '-',
    mode: gateway.mode || settings?.stripeMode || 'test',
    webhookHealthy: gateway.webhookHealthy ?? settings?.stripeWebhookHealthy !== false,
    lastSyncAt: gateway.lastSyncAt || settings?.stripeLastSyncAt || null,
    provider: gateway.provider || settings?.paymentGatewayProvider || 'stripe',
    supportedMethods: Array.isArray(gateway.supportedMethods) ? gateway.supportedMethods : settings?.supportedPaymentMethods || ['card'],
  };
};

export const updateUserSubscription = async (userId: string, payload: { plan?: 'basic' | 'pro' | 'elite'; expiresAt?: string | null }) => {
  await updateDoc(doc(firestore, 'users', userId), {
    ...(payload.plan ? { plan: payload.plan, subscription_plan: payload.plan } : {}),
    ...(payload.expiresAt !== undefined ? { subscription_expires_at: payload.expiresAt } : {}),
    updated_at: serverTimestamp(),
  });
};

export const getAdminUsers = async (): Promise<Array<UserProfile & { status?: string; plan?: string }>> => {
  const snap = await getDocs(collection(firestore, 'users'));
  return snap.docs.map((item) => {
    const data = item.data() as any;
    return {
      ...(data as UserProfile),
      id: data.id || item.id,
      status: data.status || 'active',
      plan: data.plan || data.subscription_plan || 'basic',
    };
  });
};

export const getAdminUserDetails = async (userId: string) => {
  const userRef = doc(firestore, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('User not found');

  const [food, body, face, posts, comments, xpLogs, payments] = await Promise.all([
    getDocs(query(collection(firestore, 'nutritionScans'), where('userId', '==', userId))),
    getDocs(query(collection(firestore, 'bodyScans'), where('userId', '==', userId))),
    getDocs(query(collection(firestore, 'faceScans'), where('userId', '==', userId))),
    getDocs(query(collection(firestore, 'posts'), where('userId', '==', userId))),
    getDocs(query(collection(firestore, 'comments'), where('user_id', '==', userId))),
    getDocs(query(collection(firestore, 'xpLogs'), where('userId', '==', userId), limit(20))),
    getDocs(query(collection(firestore, 'payments'), where('userId', '==', userId), limit(20))),
  ]);

  return {
    profile: { ...(userSnap.data() as any), id: userSnap.id },
    stats: {
      foodScans: food.size,
      bodyScans: body.size,
      faceScans: face.size,
      posts: posts.size,
      comments: comments.size,
    },
    scans: {
      food: food.docs.slice(0, 10).map((item) => ({ id: item.id, ...(item.data() as any), scanType: 'food' })),
      body: body.docs.slice(0, 10).map((item) => ({ id: item.id, ...(item.data() as any), scanType: 'body' })),
      face: face.docs.slice(0, 10).map((item) => ({ id: item.id, ...(item.data() as any), scanType: 'face' })),
    },
    xpLogs: xpLogs.docs.map((item) => ({ id: item.id, ...(item.data() as any) })),
    payments: payments.docs.map((item) => ({ id: item.id, ...(item.data() as any) })),
    community: {
      posts: posts.docs.slice(0, 10).map((item) => ({ id: item.id, ...(item.data() as any) })),
      comments: comments.docs.slice(0, 10).map((item) => ({ id: item.id, ...(item.data() as any) })),
    },
  };
};

export const updateUserAdminFields = async (userId: string, fields: Record<string, any>) => {
  await updateDoc(doc(firestore, 'users', userId), fields);
};

export const getScannerMetrics = async (type: ScannerType) => {
  const collectionName = type === 'food' ? 'nutritionScans' : type === 'body' ? 'bodyScans' : 'faceScans';
  const scannerSnap = await getDocs(collection(firestore, collectionName));

  let confidenceTotal = 0;
  let confidenceCount = 0;

  scannerSnap.docs.forEach((scanDoc) => {
    const data = scanDoc.data() as any;
    const confidence = Number(data?.results?.confidence ?? 0);
    if (confidence > 0) {
      confidenceTotal += confidence;
      confidenceCount += 1;
    }
  });

  const configSnap = await getDoc(doc(firestore, 'adminSettings', 'scanners'));
  const config = (configSnap.data() || {}) as any;

  return {
    total: scannerSnap.size,
    confidence: confidenceCount ? confidenceTotal / confidenceCount : 0,
    enabled: config?.[`${type}Enabled`] ?? true,
    limits: config?.limits || { basic: 8, pro: 30, elite: 999 },
  };
};

export const getScannerInsights = async (type: ScannerType) => {
  const collectionName = type === 'food' ? 'nutritionScans' : type === 'body' ? 'bodyScans' : 'faceScans';
  const scannerSnap = await getDocs(query(collection(firestore, collectionName), orderBy('created_at', 'desc'), limit(120)));

  let flagged = 0;
  let lowConfidence = 0;
  const trendMap: Record<string, number> = {};

  scannerSnap.docs.forEach((scanDoc) => {
    const data = scanDoc.data() as any;
    const createdAtMs = toMillis(data.created_at);
    if (createdAtMs) {
      const day = new Date(createdAtMs).toISOString().slice(0, 10);
      trendMap[day] = (trendMap[day] || 0) + 1;
    }
    const confidence = Number(data?.results?.confidence ?? 0);
    const isFlagged = !!data?.flagged || confidence > 0 && confidence < 55;
    if (isFlagged) flagged += 1;
    if (confidence > 0 && confidence < 55) lowConfidence += 1;
  });

  const trendRows = Object.entries(trendMap)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 7)
    .map(([date, count]) => ({ date, count }));

  return {
    flagged,
    lowConfidence,
    trendRows,
  };
};

export const getFlaggedScans = async () => {
  const [food, body, face] = await Promise.all([
    getDocs(query(collection(firestore, 'nutritionScans'), orderBy('created_at', 'desc'), limit(80))),
    getDocs(query(collection(firestore, 'bodyScans'), orderBy('created_at', 'desc'), limit(80))),
    getDocs(query(collection(firestore, 'faceScans'), orderBy('created_at', 'desc'), limit(80))),
  ]);

  const mapScan = (scanType: ScannerType, docs: any[]) =>
    docs
      .map((item) => {
        const data = item.data() as any;
        const confidence = Number(data?.results?.confidence ?? 0);
        const flagged = !!data?.flagged || (confidence > 0 && confidence < 55);
        return {
          id: item.id,
          scanType,
          userId: data.userId || '-',
          confidence,
          flagged,
          reason: data.flagReason || (confidence > 0 && confidence < 55 ? 'Low AI confidence' : 'Manual review'),
          created_at: data.created_at || null,
        };
      })
      .filter((item) => item.flagged);

  const rows = [...mapScan('food', food.docs), ...mapScan('body', body.docs), ...mapScan('face', face.docs)]
    .sort((a, b) => toMillis(b.created_at) - toMillis(a.created_at));

  return rows;
};

export const setScannerEnabled = async (type: ScannerType, enabled: boolean) => {
  const settingsRef = doc(firestore, 'adminSettings', 'scanners');
  const existing = await getDoc(settingsRef);
  await setDoc(
    settingsRef,
    {
      ...(existing.data() || {}),
      [`${type}Enabled`]: enabled,
      updated_at: serverTimestamp(),
    },
    { merge: true }
  );
};

export const isScannerEnabled = async (type: ScannerType): Promise<boolean> => {
  const settingsRef = doc(firestore, 'adminSettings', 'scanners');
  const snap = await getDoc(settingsRef);
  if (!snap.exists()) return true;
  const data = snap.data() as any;
  return data?.[`${type}Enabled`] ?? true;
};

export const getCommunityPosts = async (): Promise<Post[]> => {
  const snap = await getDocs(query(collection(firestore, 'posts'), orderBy('created_at', 'desc'), limit(50)));
  return snap.docs.map((item) => {
    const data = item.data() as any;
    return { ...(data as Post), id: item.id };
  });
};

export const deleteCommunityPost = async (postId: string) => {
  await deleteDoc(doc(firestore, 'posts', postId));
};

export const getCommunityGroups = async (): Promise<Group[]> => {
  const snap = await getDocs(query(collection(firestore, 'groups'), orderBy('created_at', 'desc'), limit(50)));
  return snap.docs.map((item) => ({ ...(item.data() as Group), id: item.id }));
};

export const getCommunityReports = async (max = 80): Promise<CommunityReportRecord[]> => {
  const snap = await getDocs(query(collection(firestore, 'communityReports'), orderBy('created_at', 'desc'), limit(max)));
  return snap.docs.map((item) => {
    const data = item.data() as any;
    return {
      id: item.id,
      targetType: data.targetType || 'post',
      targetId: data.targetId || '-',
      reportedBy: data.reportedBy || '-',
      reason: data.reason || '-',
      status: data.status || 'open',
      resolution: data.resolution,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  });
};

export const resolveCommunityReport = async (reportId: string, resolution: 'resolved' | 'dismissed', note?: string) => {
  await updateDoc(doc(firestore, 'communityReports', reportId), {
    status: resolution,
    resolution: note || resolution,
    updated_at: serverTimestamp(),
  });
};

export const setUserModerationStatus = async (userId: string, status: 'active' | 'banned' | 'shadow-banned', reason?: string) => {
  await updateDoc(doc(firestore, 'users', userId), {
    status,
    moderation_reason: reason || '',
    updated_at: serverTimestamp(),
  });

  await writeSystemLog({
    type: 'user-moderation',
    message: `Set user ${userId} status to ${status}`,
    meta: { reason: reason || '' },
  });
};

export const getBlockedUsers = async () => {
  const snap = await getDocs(query(collection(firestore, 'users'), where('status', 'in', ['banned', 'shadow-banned']), limit(120)));
  return snap.docs.map((item) => {
    const data = item.data() as any;
    return {
      id: item.id,
      email: data.email || '-',
      display_name: data.display_name || '-',
      status: data.status || 'banned',
      reason: data.moderation_reason || '-',
      updated_at: data.updated_at,
    };
  });
};

export type AdminContentItem = {
  id?: string;
  type: 'workout' | 'diet' | 'skincare' | 'prompt';
  title: string;
  plan: 'basic' | 'pro' | 'elite';
  level: number;
  premium: boolean;
  body?: string;
};

export const getContentItems = async (type: AdminContentItem['type']) => {
  const snap = await getDocs(query(collection(firestore, 'adminContent'), where('type', '==', type)));
  return snap.docs.map((item) => ({ ...(item.data() as AdminContentItem), id: item.id }));
};

export const upsertContentItem = async (item: AdminContentItem) => {
  if (item.id) {
    await setDoc(doc(firestore, 'adminContent', item.id), { ...item, updated_at: serverTimestamp() }, { merge: true });
    return item.id;
  }
  const ref = await addDoc(collection(firestore, 'adminContent'), { ...item, created_at: serverTimestamp() });
  return ref.id;
};

export const createAdminNotification = async (payload: {
  type: AdminNotificationType;
  title?: string;
  message: string;
  target?: 'all' | 'basic' | 'pro' | 'elite';
}) => {
  const title = payload.title?.trim() || (payload.type === 'email' ? 'Email campaign' : payload.type === 'push' ? 'Push notification' : 'In-app announcement');
  const target = payload.target || 'all';

  const ref = await addDoc(collection(firestore, 'adminNotifications'), {
    type: payload.type,
    title,
    message: payload.message,
    target,
    status: 'queued',
    read: false,
    created_at: serverTimestamp(),
  });

  // Store a delivery task so backend workers (Cloud Function / webhook worker) can process it.
  await addDoc(collection(firestore, 'messageJobs'), {
    notificationId: ref.id,
    type: payload.type,
    title,
    message: payload.message,
    target,
    status: 'queued',
    created_at: serverTimestamp(),
  });

  // 3. Optional Direct Webhook / Back-end Logic
  const settings = (await getAdminSettings('email')) as AdminEmailSettings | null;
  if (settings?.deliveryWebhookUrl) {
    try {
      await postToWebhook(settings.deliveryWebhookUrl, settings.deliveryWebhookApiKey, {
        action: 'send-mass-broadcast',
        notificationId: ref.id,
        type: payload.type,
        title,
        message: payload.message,
        target,
        senderName: settings.senderName,
        senderEmail: settings.senderEmail || settings.gmail,
        smtpHost: settings.smtpHost,
        port: settings.port,
        gmail: settings.gmail,
        appPassword: settings.appPassword,
      });
    } catch (e) {
      console.error('Broadcast notification webhook failed', e);
    }
  }

  if (payload.type === 'in-app') {
    await addDoc(collection(firestore, 'inAppBroadcasts'), {
      title,
      message: payload.message,
      target,
      active: true,
      created_at: serverTimestamp(),
    });
  }

  return ref.id;
};

export const getAdminNotifications = async (max = 30): Promise<AdminNotificationRecord[]> => {
  const snap = await getDocs(query(collection(firestore, 'adminNotifications'), orderBy('created_at', 'desc'), limit(max)));
  return snap.docs.map((item) => {
    const data = item.data() as any;
    return {
      id: item.id,
      type: data.type || 'in-app',
      title: data.title || 'Notification',
      message: data.message || '',
      target: data.target || 'all',
      status: data.status || 'queued',
      read: !!data.read,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  });
};

export const markAdminNotificationRead = async (notificationId: string) => {
  await updateDoc(doc(firestore, 'adminNotifications', notificationId), {
    read: true,
    status: 'read',
    updated_at: serverTimestamp(),
  });
};

export const markAllAdminNotificationsRead = async () => {
  const snap = await getDocs(query(collection(firestore, 'adminNotifications'), where('read', '==', false), limit(100)));
  await Promise.all(
    snap.docs.map((item) => updateDoc(item.ref, { read: true, status: 'read', updated_at: serverTimestamp() }))
  );
};

const postToWebhook = async (url: string, apiKey: string | undefined, body: Record<string, any>) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Webhook delivery failed with status ${response.status}`);
  }
};

export const sendAdminTestEmail = async (recipient: string) => {
  const settings = (await getAdminSettings('email')) as AdminEmailSettings | null;
  if (!settings?.deliveryWebhookUrl) {
    throw new Error('Missing email delivery webhook URL. Set it in Settings > Email first.');
  }

  await postToWebhook(settings.deliveryWebhookUrl, settings.deliveryWebhookApiKey, {
    action: 'send-test-email',
    to: recipient,
    subject: 'LevelUp Admin SMTP Test',
    text: 'Your SMTP webhook integration is working.',
    senderName: settings.senderName || 'LevelUp Team',
    senderEmail: settings.senderEmail || settings.gmail,
    username: settings.gmail,
    smtpHost: settings.smtpHost,
    port: settings.port,
    gmail: settings.gmail,
    appPassword: settings.appPassword,
  });
};

export const sendDirectEmail = async (payload: { to: string; subject: string; message: string }) => {
  const settings = (await getAdminSettings('email')) as AdminEmailSettings | null;
  
  // 1. Log the campaign record
  await addDoc(collection(firestore, 'adminNotifications'), {
    type: 'email',
    title: payload.subject,
    message: payload.message,
    target: 'individual',
    status: 'sent',
    read: false,
    created_at: serverTimestamp(),
  });

  // 2. Queue for delivery (Message Job)
  const job = {
    type: 'email',
    to: payload.to,
    subject: payload.subject,
    text: payload.message,
    status: 'queued',
    created_at: serverTimestamp(),
  };
  
  await addDoc(collection(firestore, 'messageJobs'), job);

  // 3. Optional direct webhook trigger
  if (settings?.deliveryWebhookUrl) {
    try {
      await postToWebhook(settings.deliveryWebhookUrl, settings.deliveryWebhookApiKey, {
        ...job,
        senderName: settings.senderName,
        senderEmail: settings.senderEmail || settings.gmail,
        smtpHost: settings.smtpHost,
        port: settings.port,
        gmail: settings.gmail,
        appPassword: settings.appPassword,
      });
    } catch (e) {
      console.error('Direct email webhook failed', e);
    }
  }
};

export const sendDirectPush = async (payload: { userId: string; title: string; message: string }) => {
  // 1. Get user token
  const userRef = doc(firestore, 'users', payload.userId);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data();
  const token = userData?.notificationToken;

  // 2. Log in notifications
  await addDoc(collection(firestore, 'adminNotifications'), {
    type: 'push',
    title: payload.title,
    message: payload.message,
    target: 'individual',
    status: token ? 'queued' : 'failed-no-token',
    read: false,
    created_at: serverTimestamp(),
  });

  if (!token) throw new Error('User has no push notification token.');

  // 3. Queue Message Job for backend FCM worker
  await addDoc(collection(firestore, 'messageJobs'), {
    type: 'push',
    token,
    title: payload.title,
    message: payload.message,
    status: 'queued',
    created_at: serverTimestamp(),
  });
};

export const queueWelcomeEmail = async (payload: { email: string; displayName?: string }) => {
  const settings = (await getAdminSettings('email')) as AdminEmailSettings | null;
  if (!settings?.welcomeEmailEnabled) return;

  await addDoc(collection(firestore, 'emailJobs'), {
    type: 'welcome',
    to: payload.email,
    subject: 'Welcome to LevelUp AI',
    text: `Welcome${payload.displayName ? ` ${payload.displayName}` : ''}! Your LevelUp AI account is ready.`,
    status: 'queued',
    created_at: serverTimestamp(),
  });

  if (settings.deliveryWebhookUrl) {
    try {
      await postToWebhook(settings.deliveryWebhookUrl, settings.deliveryWebhookApiKey, {
        action: 'send-welcome-email',
        to: payload.email,
        displayName: payload.displayName,
        subject: 'Welcome to LevelUp AI',
        senderName: settings.senderName,
        senderEmail: settings.senderEmail || settings.gmail,
        smtpHost: settings.smtpHost,
        port: settings.port,
        gmail: settings.gmail,
        appPassword: settings.appPassword,
      });
    } catch (e) {
      console.error('Welcome email webhook failed', e);
    }
  }
};

export const getAdminSettings = async (section: string) => {
  const snap = await getDoc(doc(firestore, 'adminSettings', section));
  return snap.exists() ? snap.data() : null;
};

export const getAdminEmailTemplates = async (): Promise<AdminEmailTemplate[]> => {
  const snap = await getDocs(collection(firestore, 'adminEmailTemplates'));
  return snap.docs.map((item) => {
    const data = item.data() as any;
    return {
      id: item.id,
      key: data.key || item.id,
      name: data.name || 'Untitled Template',
      subject: data.subject || '',
      body: data.body || '',
      status: data.status === 'inactive' ? 'inactive' : 'active',
      variables: Array.isArray(data.variables) ? data.variables : [],
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  });
};

export const getAdminEmailTemplate = async (templateId: string): Promise<AdminEmailTemplate | null> => {
  const snap = await getDoc(doc(firestore, 'adminEmailTemplates', templateId));
  if (!snap.exists()) return null;
  const data = snap.data() as any;
  return {
    id: snap.id,
    key: data.key || snap.id,
    name: data.name || 'Untitled Template',
    subject: data.subject || '',
    body: data.body || '',
    status: data.status === 'inactive' ? 'inactive' : 'active',
    variables: Array.isArray(data.variables) ? data.variables : [],
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
};

export const upsertAdminEmailTemplate = async (payload: AdminEmailTemplate): Promise<AdminEmailTemplate> => {
  if (payload.id) {
    const ref = doc(firestore, 'adminEmailTemplates', payload.id);
    await setDoc(
      ref,
      {
        key: payload.key,
        name: payload.name,
        subject: payload.subject,
        body: payload.body,
        status: payload.status,
        variables: payload.variables,
        updated_at: serverTimestamp(),
      },
      { merge: true }
    );
    const updated = await getAdminEmailTemplate(payload.id);
    return updated || payload;
  }

  const ref = await addDoc(collection(firestore, 'adminEmailTemplates'), {
    key: payload.key,
    name: payload.name,
    subject: payload.subject,
    body: payload.body,
    status: payload.status,
    variables: payload.variables,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  const created = await getAdminEmailTemplate(ref.id);
  return created || { ...payload, id: ref.id };
};

export const saveAdminSettings = async (section: string, values: Record<string, any>) => {
  await setDoc(doc(firestore, 'adminSettings', section), { ...values, updated_at: serverTimestamp() }, { merge: true });
};

export const getAdminUsersAndRoles = async (): Promise<Array<AdminUserRecord & { id: string }>> => {
  const snap = await getDocs(query(collection(firestore, 'adminUsers'), orderBy('created_at', 'desc'), limit(50)));
  return snap.docs.map((item) => ({ id: item.id, ...(item.data() as any) }));
};

export const ensureAdminUserRecord = async (payload: { email: string; uid?: string; role: 'super-admin' | 'manager' | 'moderator' | 'support'; active?: boolean }) => {
  const normalizedEmail = payload.email.trim().toLowerCase();
  if (!normalizedEmail) throw new Error('Admin email is required.');

  const existing = await getDocs(query(collection(firestore, 'adminUsers'), where('email', '==', normalizedEmail), limit(1)));
  const record = {
    email: normalizedEmail,
    ...(payload.uid ? { uid: payload.uid } : {}),
    role: payload.role,
    active: payload.active !== false,
    updated_at: serverTimestamp(),
  };

  if (!existing.empty) {
    const ref = existing.docs[0].ref;
    await setDoc(ref, record, { merge: true });
    return { id: ref.id, ...record };
  }

  const ref = await addDoc(collection(firestore, 'adminUsers'), {
    ...record,
    created_at: serverTimestamp(),
  });

  return { id: ref.id, ...record };
};

export const createAdminUser = async (payload: { email: string; uid?: string; role: 'super-admin' | 'manager' | 'moderator' | 'support' }) => {
  const normalizedEmail = payload.email.trim().toLowerCase();
  if (!normalizedEmail) throw new Error('Admin email is required.');

  const existing = await getDocs(query(collection(firestore, 'adminUsers'), where('email', '==', normalizedEmail), limit(1)));
  if (!existing.empty) throw new Error('Admin user already exists.');

  await addDoc(collection(firestore, 'adminUsers'), {
    email: normalizedEmail,
    ...(payload.uid ? { uid: payload.uid } : {}),
    role: payload.role,
    active: true,
    created_at: serverTimestamp(),
  });
};

export const getSystemLogs = async () => {
  const snap = await getDocs(query(collection(firestore, 'adminSystemLogs'), orderBy('created_at', 'desc'), limit(60)));
  return snap.docs.map((item) => ({ id: item.id, ...(item.data() as any) }));
};

export const writeSystemLog = async (payload: { type: string; message: string; meta?: Record<string, any> }) => {
  await addDoc(collection(firestore, 'adminSystemLogs'), {
    ...payload,
    created_at: serverTimestamp(),
  });
};
