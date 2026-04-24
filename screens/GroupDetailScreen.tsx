
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, UserPlus, LogOut, Plus, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { hapticTap, hapticSuccess } from '../utils/haptics';
import { deleteGroup, getGroupDetails, joinGroup, leaveGroup, subscribeToPostsForGroup } from '../services/firebaseService';
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
        let isMounted = true;
        let unsubscribePosts: (() => void) | null = null;

        const fetchGroupAndSubscribePosts = async () => {
            if (!groupId) return;
            setLoading(true);
            setPostsLoading(true);
            try {
                const groupData = await getGroupDetails(groupId);

                if (isMounted) {
                    setGroup(groupData);
                }

                if (groupData && user && isMounted) {
                    setIsMember(groupData.members.includes(user.uid));
                }

                unsubscribePosts = subscribeToPostsForGroup(
                    groupId,
                    (groupPosts) => {
                        if (!isMounted) return;
                        setPosts(groupPosts);
                        setPostsLoading(false);
                    },
                    (error) => {
                        console.error('Failed to subscribe to group posts:', error);
                        if (!isMounted) return;
                        setPostsLoading(false);
                    }
                );
            } catch (error) {
                console.error("Failed to fetch group details:", error);
                if (isMounted) {
                    setPostsLoading(false);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchGroupAndSubscribePosts();

        return () => {
            isMounted = false;
            if (unsubscribePosts) {
                unsubscribePosts();
            }
        };
    }, [groupId, user]);

    const handleMembershipChange = async () => {
        if (!user || !groupId || !group) return;

        setIsUpdatingMembership(true);
        hapticTap();
        try {
            if (isMember) {
                // Cannot leave if you are the owner
                if (group.owner_id === user.uid) {
                    alert("As the owner, you cannot leave the group. You must delete it instead (feature coming soon).");
                    setIsUpdatingMembership(false);
                    return;
                }
                await leaveGroup(groupId);
                setGroup(prev => prev ? { ...prev, members: prev.members.filter(id => id !== user.uid) } : null);
                setIsMember(false);
            } else {
                await joinGroup(groupId);
                setGroup(prev => prev ? { ...prev, members: [...prev.members, user.uid] } : null);
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

    const handleDeleteGroup = async () => {
        if (!groupId || !group || !user) return;
        if (group.owner_id !== user.uid) return;

        const confirmed = window.confirm('Delete this group permanently? This also deletes all group posts and comments.');
        if (!confirmed) return;

        setIsUpdatingMembership(true);
        hapticTap();

        try {
            await deleteGroup(groupId);
            hapticSuccess();
            navigate('/community');
        } catch (error: any) {
            console.error('Failed to delete group:', error);
            alert(error?.message || 'Failed to delete group. Please try again.');
        } finally {
            setIsUpdatingMembership(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
            </div>
        );
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

                {user && group.owner_id === user.uid && (
                    <button
                        onClick={handleDeleteGroup}
                        disabled={isUpdatingMembership}
                        className="w-full bg-red-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-red-700 transition duration-300 flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                    >
                        {isUpdatingMembership ? <Loader2 className="animate-spin" /> : <><Trash2 size={18} /> Delete Group</>}
                    </button>
                )}

                {/* Group Feed */}
                 <div className="space-y-4">
                    <h3 className="font-bold text-lg text-gray-800 pt-2">Group Activity</h3>
                    {postsLoading ? (
                        <div className="flex justify-center items-center p-10">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                        </div>
                    ) : posts.length === 0 ? (
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
