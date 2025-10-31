import React, { useState, useEffect } from 'react';
import PostCard from './PostCard';
import { getPosts } from '../services/firebaseService';
import { Post } from '../types';
import { Loader2 } from 'lucide-react';

const ActivityFeed: React.FC = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const fetchedPosts = await getPosts();
                setPosts(fetchedPosts);
            } catch (err) {
                console.error(err);
                setError("Failed to load feed. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center p-10">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        );
    }

    if (error) {
        return <p className="text-center text-red-500">{error}</p>;
    }
    
    if (posts.length === 0) {
        return <p className="text-center text-gray-500 mt-8">The feed is empty. Be the first to post!</p>;
    }

    return (
        <div className="space-y-4">
            {posts.map(post => (
                <PostCard key={post.id} post={post} />
            ))}
        </div>
    );
};

export default ActivityFeed;