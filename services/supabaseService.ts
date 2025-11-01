import { supabase } from '../config/supabase';
import { NutritionScanResult, BodyScanResult, FaceScanResult, NutritionScan, BodyScan, FaceScan, Post, Group } from '../types';
import { Provider } from '@supabase/supabase-js';


// --- AUTHENTICATION ---

export const signUpWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
};

export const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
};

export const signInWithOAuth = async (provider: Provider) => {
    const { data, error } = await supabase.auth.signInWithOAuth({ 
        provider,
        options: {
            redirectTo: window.location.origin,
        },
    });
    if (error) throw error;
    return data;
};

export const signOutUser = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

export const sendPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/login`, // Redirect back to login after reset
    });
    if (error) throw error;
};


// --- STORAGE ---

export const uploadImage = async (file: Blob | File, userId: string, bucket: 'scans' | 'posts'): Promise<string> => {
    const timestamp = new Date().getTime();
    const filePath = `${userId}/${timestamp}.jpeg`;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
};

// --- DATABASE: SCANS ---

export const saveNutritionScan = async (userId: string, imageUrl: string, results: NutritionScanResult) => {
    const { error } = await supabase.from('nutrition_scans').insert({
        user_id: userId,
        image_url: imageUrl,
        results,
    });
    if (error) throw error;
};

export const getNutritionScans = async (userId: string): Promise<NutritionScan[]> => {
    const { data, error } = await supabase
        .from('nutrition_scans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
};

export const saveBodyScan = async (userId: string, imageUrl: string, results: BodyScanResult) => {
    const { error } = await supabase.from('body_scans').insert({
        user_id: userId,
        image_url: imageUrl,
        results,
    });
    if (error) throw error;
};

export const getBodyScans = async (userId: string): Promise<BodyScan[]> => {
    const { data, error } = await supabase
        .from('body_scans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
};

export const saveFaceScan = async (userId: string, imageUrl: string, results: FaceScanResult) => {
    const { error } = await supabase.from('face_scans').insert({
        user_id: userId,
        image_url: imageUrl,
        results,
    });
    if (error) throw error;
};

export const getFaceScans = async (userId: string): Promise<FaceScan[]> => {
    const { data, error } = await supabase
        .from('face_scans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
};


// --- DATABASE: COMMUNITY (POSTS & GROUPS) ---

export const createPost = async (userId: string, authorDisplayName: string, content: string, imageUrl?: string) => {
    const { error } = await supabase.from('posts').insert({
        user_id: userId,
        author_display_name: authorDisplayName,
        content,
        image_url: imageUrl,
    });
    if (error) throw error;
};

export const getPosts = async (): Promise<Post[]> => {
    const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
};

export const createGroup = async (name: string, description: string, icon: string, ownerId: string) => {
    const { data, error } = await supabase.from('groups').insert({
        name,
        description,
        icon,
        owner_id: ownerId,
        members: [ownerId] // Owner is the first member
    }).select().single();
    if (error) throw error;
    return data.id;
};

export const getUserGroups = async (userId: string): Promise<Group[]> => {
    const { data, error } = await supabase
        .from('groups')
        .select('*')
        .contains('members', [userId])
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
};

export const getAllGroups = async (): Promise<Group[]> => {
    const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
};

export const getGroupDetails = async (groupId: string): Promise<Group | null> => {
    const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();
    if (error) throw error;
    return data;
};

export const joinGroup = async (groupId: string): Promise<void> => {
    const { error } = await supabase.rpc('join_group', { group_id_to_join: groupId });
    if (error) throw error;
};

export const leaveGroup = async (groupId: string, userId: string): Promise<void> => {
    const { error } = await supabase.rpc('leave_group', { group_id_to_leave: groupId });
    if (error) throw error;
};