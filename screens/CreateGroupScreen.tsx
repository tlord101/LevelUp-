import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createGroup } from '../services/supabaseService';
import { hapticTap, hapticSuccess, hapticError } from '../utils/haptics';

const emojiSuggestions = ['🏋️', '🧘‍♀️', '🏃‍♂️', '🥗', '💪', '✨', '🧠', '🤝'];

const CreateGroupScreen: React.FC = () => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [icon, setIcon] = useState('🤝');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { user } = useAuth();
    const navigate = useNavigate();

    const handleCreate = async () => {
        if (!name.trim() || !description.trim()) {
            setError("Group name and description cannot be empty.");
            hapticError();
            return;
        }
        if (!user) {
            setError("You must be logged in to create a group.");
            hapticError();
            return;
        }

        setIsLoading(true);
        setError(null);
        hapticTap();

        try {
            const newGroupId = await createGroup(name, description, icon, user.id);
            hapticSuccess();
            navigate(`/groups/${newGroupId}`);
        } catch (err: any) {
            console.error("Failed to create group:", err);
            setError("Could not create group. Please try again.");
            hapticError();
        } finally {
            setIsLoading(false);
        }
    };

    const isButtonDisabled = isLoading || !name.trim() || !description.trim();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 p-4 border-b border-gray-200 flex items-center justify-between">
                <button onClick={() => { hapticTap(); navigate(-1); }} className="p-2 rounded-full hover:bg-gray-100">
                    <ArrowLeft size={24} className="text-gray-800" />
                </button>
                <h1 className="text-xl font-bold text-gray-900">Create a New Group</h1>
                <button
                    onClick={handleCreate}
                    disabled={isButtonDisabled}
                    className="bg-purple-600 text-white font-semibold px-5 py-2 rounded-full text-sm hover:bg-purple-700 transition disabled:bg-purple-300 disabled:cursor-not-allowed flex items-center justify-center min-w-[80px]"
                >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Create'}
                </button>
            </header>

            <main className="flex-grow p-4 space-y-6">
                <div className="text-center">
                    <div className="inline-block bg-gray-200 p-4 rounded-full">
                        <span className="text-6xl">{icon}</span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Group Icon</label>
                    <div className="flex flex-wrap gap-2 bg-white p-3 rounded-xl border">
                        {emojiSuggestions.map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => { setIcon(emoji); hapticTap(); }}
                                className={`p-2 text-2xl rounded-lg transition ${icon === emoji ? 'bg-purple-200 ring-2 ring-purple-500' : 'bg-gray-100 hover:bg-gray-200'}`}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Weekend Warriors"
                        maxLength={50}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                    />
                </div>

                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What is this group about?"
                        rows={4}
                        maxLength={200}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 resize-none"
                    />
                </div>
                 {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            </main>
        </div>
    );
};

export default CreateGroupScreen;