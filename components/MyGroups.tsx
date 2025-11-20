
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserGroups } from '../services/firebaseService';
import { Group } from '../types';
import { Loader2, Plus } from 'lucide-react';
import GroupListItem from './GroupListItem';
import { hapticTap } from '../utils/haptics';

const MyGroups: React.FC = () => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchGroups = async () => {
            if (user) {
                try {
                    const userGroups = await getUserGroups(user.uid);
                    setGroups(userGroups);
                } catch (error) {
                    console.error("Failed to fetch user groups:", error);
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchGroups();
    }, [user]);

    const handleCreateGroup = () => {
        hapticTap();
        navigate('/create-group');
    };

    const handleDiscoverGroups = () => {
        hapticTap();
        navigate('/discover-groups');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center p-10">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {groups.length === 0 ? (
                <div className="bg-white p-6 rounded-xl shadow-sm text-center">
                    <p className="text-gray-600 font-semibold mb-2">You haven't joined any groups yet.</p>
                    <p className="text-sm text-gray-500 mb-4">Join a group to connect with others!</p>
                    <button
                        onClick={handleCreateGroup}
                        className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-purple-700 transition duration-300 flex items-center justify-center gap-2"
                    >
                        <Plus size={20} /> Create New Group
                    </button>
                </div>
            ) : (
                <div className="bg-white p-4 rounded-xl shadow-sm space-y-2">
                    {groups.map(group => (
                        <GroupListItem key={group.id} group={group} />
                    ))}
                </div>
            )}

            <button
                onClick={handleDiscoverGroups}
                className="w-full bg-purple-100 text-purple-700 font-bold py-3 px-4 rounded-xl hover:bg-purple-200 transition duration-300"
            >
                Discover More Groups
            </button>
             <button
                onClick={handleCreateGroup}
                className="w-full bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-xl hover:bg-gray-300 transition duration-300"
            >
                Create Your Own Group
            </button>
        </div>
    );
};

export default MyGroups;
