
import { supabase } from '../config/supabase';
import { NutritionScanResult, BodyScanResult, FaceScanResult, NutritionScan, BodyScan, FaceScan, Post, Group, Comment, NutritionLog } from '../types';
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

export const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
};

export const updateUserMetadata = async (metadata: any) => {
    const { error } = await supabase.auth.updateUser({ data: metadata });
    if (error) throw error;
};


// --- STORAGE ---

export const uploadImage = async (file: Blob | File, userId: string, bucket: 'scans' | 'posts', folder?: string): Promise<string> => {
    const timestamp = new Date().getTime();
    const filePath = folder 
        ? `${folder}/${userId}/${timestamp}.jpeg` 
        : `${userId}/${timestamp}.jpeg`;

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

// --- DATABASE: NUTRITION LOGS ---

export const logNutritionIntake = async (userId: string, logData: Omit<NutritionLog, 'id' | 'user_id' | 'created_at'> & { created_at?: string }) => {
    const { error } = await supabase.from('daily_nutrition_logs').insert({
        user_id: userId,
        ...logData,
    });
    if (error) throw error;
};

export const getTodaysNutritionLogs = async (userId: string): Promise<NutritionLog[]> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
        .from('daily_nutrition_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
};

export const getNutritionLogsForDate = async (userId: string, date: Date): Promise<NutritionLog[]> => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
        .from('daily_nutrition_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
};

export const deleteNutritionLog = async (logId: string) => {
    const { error } = await supabase
        .from('daily_nutrition_logs')
        .delete()
        .eq('id', logId);
    if (error) throw error;
};

export const updateNutritionLog = async (logId: string, updates: Partial<NutritionLog>) => {
    const { error } = await supabase
        .from('daily_nutrition_logs')
        .update(updates)
        .eq('id', logId);
    if (error) throw error;
};


// --- DATABASE: COMMUNITY (POSTS & GROUPS) ---

export const createPost = async (userId: string, authorDisplayName: string, content: string, imageUrl?: string, groupId?: string | null) => {
    const { error } = await supabase.from('posts').insert({
        user_id: userId,
        author_display_name: authorDisplayName,
        content,
        image_url: imageUrl,
        group_id: groupId,
        likes: [],
        comment_count: 0,
    });
    if (error) throw error;
};

export const getPosts = async (): Promise<Post[]> => {
    const { data, error } = await supabase
        .from('posts')
        .select('*')
        .is('group_id', null) // Only fetch posts not associated with a group for the main feed
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
};

export const getPostsForGroup = async (groupId: string): Promise<Post[]> => {
    const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
};

export const likePost = async (postId: string): Promise<void> => {
    const { error } = await supabase.rpc('like_post', { post_id_to_like: postId });
    if (error) throw error;
};

export const unlikePost = async (postId: string): Promise<void> => {
    const { error } = await supabase.rpc('unlike_post', { post_id_to_unlike: postId });
    if (error) throw error;
};

export const getCommentsForPost = async (postId: string): Promise<Comment[]> => {
    const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
};

export const createComment = async (postId: string, userId: string, authorDisplayName: string, content: string): Promise<Comment> => {
    // 1. Insert the new comment
    const { data: newComment, error: insertError } = await supabase
        .from('comments')
        .insert({
            post_id: postId,
            user_id: userId,
            author_display_name: authorDisplayName,
            content: content
        })
        .select()
        .single();
    
    if (insertError) throw insertError;

    // 2. Increment the comment count on the post
    const { error: rpcError } = await supabase.rpc('increment_comment_count', { post_id_to_update: postId });

    if (rpcError) {
        // This is a bit tricky. The comment was created, but the count failed.
        // For now, we'll log the error and still return the comment.
        console.error("Failed to increment comment count:", rpcError);
    }
    
    return newComment;
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
    if (!data) throw new Error('Failed to create group');
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

export const leaveGroup = async (groupId: string): Promise<void> => {
    const { error } = await supabase.rpc('leave_group', { group_id_to_leave: groupId });
    if (error) throw error;
};

// --- DATABASE: AI COACH FUNCTIONS ---

export const getUserStats = async (userId: string) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('level, xp, stats')
        .eq('id', userId)
        .single();
    if (error) throw error;
    return data;
};

export const getLatestScan = async (userId:string, scanType: 'nutrition' | 'body' | 'face') => {
    let tableName: 'nutrition_scans' | 'body_scans' | 'face_scans';

    switch(scanType) {
        case 'nutrition':
            tableName = 'nutrition_scans';
            break;
        case 'body':
            tableName = 'body_scans';
            break;
        case 'face':
            tableName = 'face_scans';
            break;
        default:
            throw new Error('Invalid scan type');
    }

    const { data, error } = await supabase
        .from(tableName)
        .select('results, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
    
    if (error) {
        if (error.code === 'PGRST116') { // PostgREST error for "exact one row not found"
            return { message: `No ${scanType} scans found for this user.`};
        }
        throw error;
    }
    return data;
}

export const getWeeklyNutritionSummary = async (userId: string) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data, error } = await supabase
        .from('nutrition_scans')
        .select('results')
        .eq('user_id', userId)
        .gte('created_at', oneWeekAgo.toISOString());

    if (error) throw error;

    if (!data || data.length === 0) {
        return { message: 'No nutrition scans found in the last week.' };
    }

    const summary = data.reduce((acc, scan) => {
        const results = scan.results as NutritionScanResult;
        acc.totalCalories += results.calories;
        acc.totalProtein += results.macros.protein;
        acc.totalCarbs += results.macros.carbs;
        acc.totalFat += results.macros.fat;
        acc.scanCount += 1;
        return acc;
    }, { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, scanCount: 0 });

    return {
        scanCount: summary.scanCount,
        averageCalories: summary.totalCalories / summary.scanCount,
        averageProtein: summary.totalProtein / summary.scanCount,
        averageCarbs: summary.totalCarbs / summary.scanCount,
        averageFat: summary.totalFat / summary.scanCount,
    };
};
