import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAllGroups, joinGroup } from '../services/firebaseService';
import { Group } from '../types';
import { hapticTap, hapticSuccess } from '../utils/haptics';

const DiscoverGroupsScreen: React.FC = () => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const allGroups = await getAllGroups();
                setGroups(allGroups);
            } catch (error) {
                console.error("Failed to fetch all groups:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchGroups();
    }, []);

    const handleJoinGroup = async (groupId: string) => {
        if (!user) return;
        setJoiningGroupId(groupId);
        hapticTap();
        try {
            await joinGroup(groupId, user.uid);
            // This is a client-side update for immediate feedback.
            setGroups(prevGroups => prevGroups.map(g => 
                g.id === groupId ? { ...g, members: [...g.members, user.uid] } : g
            ));
            hapticSuccess();
        } catch (error) {
            console.error("Failed to join group:", error);
        } finally {
            setJoiningGroupId(null);
        }
    };

    const handleViewGroup = (groupId: string) => {
        hapticTap();
        navigate(`/groups/${groupId}`);
    };
    
    const handleCreateGroup = () => {
        hapticTap();
        navigate('/create-group');
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <header className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-gray-200 p-4 flex items-center z-10">
                <button onClick={() => { hapticTap(); navigate(-1); }} className="mr-4 p-2 rounded-full hover:bg-gray-100">
                    <ArrowLeft size={24} className="text-gray-800" />
                </button>
                <h1 className="text-xl font-bold text-gray-900">Discover Groups</h1>
            </header>

            <main className="p-4 space-y-4">
                 <button
                    onClick={handleCreateGroup}
                    className="w-full bg-white border-2 border-dashed border-gray-300 text-gray-600 font-bold py-4 px-4 rounded-xl hover:bg-gray-100 hover:border-purple-400 transition duration-300 flex items-center justify-center gap-2"
                >
                    <Plus size={20} /> Create Your Own Group
                </button>
            
                {loading ? (
                    <div className="flex justify-center items-center p-10">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                    </div>
                ) : groups.length === 0 ? (
                     <div className="text-center p-8 bg-white rounded-xl shadow-sm">
                        <p className="text-gray-600 font-semibold">No groups found.</p>
                        <p className="text-sm text-gray-500 mt-1">Why not be the first to create one?</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {groups.map(group => {
                            const isMember = user ? group.members.includes(user.uid) : false;
                            const isJoining = joiningGroupId === group.id;

                            return (
                                <div key={group.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-4">
                                    <div className="text-4xl bg-gray-100 p-3 rounded-lg">{group.icon}</div>
                                    <div className="flex-grow">
                                        <h3 className="font-bold text-gray-800">{group.name}</h3>
                                        <p className="text-sm text-gray-500">{group.members.length} member{group.members.length !== 1 ? 's' : ''}</p>
                                    </div>
                                    {isMember ? (
                                        <button onClick={() => handleViewGroup(group.id)} className="bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-full text-sm flex items-center gap-1">
                                            <Check size={16} /> Joined
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleJoinGroup(group.id)} 
                                            disabled={isJoining}
                                            className="bg-purple-600 text-white font-semibold px-4 py-2 rounded-full text-sm hover:bg-purple-700 transition disabled:bg-purple-300 flex items-center justify-center min-w-[80px]"
                                        >
                                            {isJoining ? <Loader2 size={16} className="animate-spin"/> : 'Join'}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

export default DiscoverGroupsScreen;
