
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, UserPlus, LogOut, Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { hapticTap, hapticSuccess } from '../utils/haptics';
import { getGroupDetails, joinGroup, leaveGroup, getPostsForGroup } from '../services/supabaseService';
import { Group, Post } from '../types';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';


const GroupDetailScreen: React.FC = () => {
    const { groupId } = useParams<{ groupId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [group, setGroup] = useState<Group | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [postsLoading, setPostsLoading] = useState(true);
    const [isMember, setIsMember] = useState(false);
    const [isUpdatingMembership, setIsUpdatingMembership] = useState(false);

    useEffect(() => {
        const fetchGroupAndPosts = async () => {
            if (!groupId) return;
            setLoading(true);
            setPostsLoading(true);
            try {
                const groupDataPromise = getGroupDetails(groupId);
                const postsPromise = getPostsForGroup(groupId);
                const [groupData, groupPosts] = await Promise.all([groupDataPromise, postsPromise]);

                setGroup(groupData);
                setPosts(groupPosts);
                if (groupData && user) {
                    setIsMember(groupData.members.includes(user.id));
                }
            } catch (error) {
                console.error("Failed to fetch group details:", error);
            } finally {
                setLoading(false);
                setPostsLoading(false);
            }
        };

        fetchGroupAndPosts();
    }, [groupId, user]);

    const handleMembershipChange = async () => {
        if (!user || !groupId || !group) return;

        setIsUpdatingMembership(true);
        hapticTap();
        try {
            if (isMember) {
                // Cannot leave if you are the owner
                if (group.owner_id === user.id) {
                    alert("As the owner, you cannot leave the group. You must delete it instead (feature coming soon).");
                    setIsUpdatingMembership(false);
                    return;
                }
                await leaveGroup(groupId);
                setGroup(prev => prev ? { ...prev, members: prev.members.filter(id => id !== user.id) } : null);
                setIsMember(false);
            } else {
                await joinGroup(groupId);
                setGroup(prev => prev ? { ...prev, members: [...prev.members, user.id] } : null);
                setIsMember(true);
            }
            hapticSuccess();
        } catch (error) {
            console.error("Failed to update membership:", error);
        } finally {
            setIsUpdatingMembership(false);
        }
    };

    const handleCreatePost = () => {
        hapticTap();
        navigate('/create-post', { state: { groupId } });
    };

    if (loading) {
        return null;
    }
    
    if (!group) {
        return (
            <div className="min-h-screen bg-gray-50">
                 <header className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-gray-200 p-4 flex items-center z-10">
                    <button onClick={() => { hapticTap(); navigate(-1); }} className="mr-4 p-2 rounded-full hover:bg-gray-100">
                        <ArrowLeft size={24} className="text-gray-800" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900">Group Not Found</h1>
                </header>
                 <main className="p-4 text-center">
                    <p>This group does not exist or may have been deleted.</p>
                </main>
            </div>
        );
    }


    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <header className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-gray-200 p-4 flex items-center z-10">
                <button onClick={() => { hapticTap(); navigate(-1); }} className="mr-4 p-2 rounded-full hover:bg-gray-100">
                    <ArrowLeft size={24} className="text-gray-800" />
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-3xl bg-gray-100 p-2 rounded-lg">{group.icon}</span>
                    <h1 className="text-xl font-bold text-gray-900">{group.name}</h1>
                </div>
            </header>
            <main className="p-4 space-y-4">
                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <p className="font-semibold text-gray-600 mb-2">About this group</p>
                    <p className="text-gray-800">{group.description}</p>
                    <p className="text-sm text-gray-500 mt-3">{group.members.length} member{group.members.length !== 1 ? 's' : ''}</p>
                </div>
                
                <button
                    onClick={handleMembershipChange}
                    disabled={isUpdatingMembership}
                    className={`w-full font-bold py-3 px-4 rounded-xl transition duration-300 flex items-center justify-center gap-2 ${
                        isMember 
                        ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    } disabled:opacity-50`}
                >
                    {isUpdatingMembership ? <Loader2 className="animate-spin" /> : (
                        isMember 
                        ? <><LogOut size={18} /> Leave Group</>
                        : <><UserPlus size={18} /> Join Group</>
                    )}
                </button>
                
                {isMember && (
                    <button
                        onClick={handleCreatePost}
                        className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-purple-700 transition duration-300 flex items-center justify-center gap-2 shadow-md"
                    >
                        <Plus size={20} /> Create Post in this Group
                    </button>
                )}

                {/* Group Feed */}
                 <div className="space-y-4">
                    <h3 className="font-bold text-lg text-gray-800 pt-2">Group Activity</h3>
                    {postsLoading ? null : posts.length === 0 ? (
                        <div className="text-center p-8 bg-white rounded-xl shadow-sm">
                            <p className="text-gray-600 font-semibold">No posts in this group yet.</p>
                            {isMember && <p className="text-sm text-gray-500 mt-1">Be the first to share something!</p>}
                        </div>
                    ) : (
                        posts.map(post => <PostCard key={post.id} post={post} />)
                    )}
                 </div>
            </main>
        </div>
    );
};

export default GroupDetailScreen;
