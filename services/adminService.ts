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
  totalRevenueMock: number;
  subscriptionBreakdown: { basic: number; pro: number; elite: number };
  xpSeries: number[];
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
  const [usersSnap, foodSnap, bodySnap, faceSnap] = await Promise.all([
    getDocs(collection(firestore, 'users')),
    getDocs(collection(firestore, 'nutritionScans')),
    getDocs(collection(firestore, 'bodyScans')),
    getDocs(collection(firestore, 'faceScans')),
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

  return {
    totalUsers: usersSnap.size,
    active24h,
    active7d,
    totalScans: foodSnap.size + bodySnap.size + faceSnap.size,
    totalRevenueMock: usersSnap.size * 12,
    subscriptionBreakdown: planCount,
    xpSeries,
  };
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

  const [food, body, face, posts, comments] = await Promise.all([
    getDocs(query(collection(firestore, 'nutritionScans'), where('userId', '==', userId))),
    getDocs(query(collection(firestore, 'bodyScans'), where('userId', '==', userId))),
    getDocs(query(collection(firestore, 'faceScans'), where('userId', '==', userId))),
    getDocs(query(collection(firestore, 'posts'), where('userId', '==', userId))),
    getDocs(query(collection(firestore, 'comments'), where('user_id', '==', userId))),
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

export const createAdminNotification = async (payload: { type: 'push' | 'in-app' | 'email'; message: string }) => {
  await addDoc(collection(firestore, 'adminNotifications'), {
    ...payload,
    status: 'queued',
    created_at: serverTimestamp(),
  });
};

export const getAdminSettings = async (section: string) => {
  const snap = await getDoc(doc(firestore, 'adminSettings', section));
  return snap.exists() ? snap.data() : null;
};

export const saveAdminSettings = async (section: string, values: Record<string, any>) => {
  await setDoc(doc(firestore, 'adminSettings', section), { ...values, updated_at: serverTimestamp() }, { merge: true });
};
