import React from 'react';
import { Heart, MessageCircle, MoreHorizontal } from 'lucide-react';
import { hapticTap } from '../utils/haptics';
import { Post } from '../types';
import { formatRelativeTime } from '../utils/formatDate';
import { Timestamp } from 'firebase/firestore';


const PostCard: React.FC<{ post: Post }> = ({ post }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm">
            {/* Header */}
            <div className="flex items-center p-4 gap-3">
                 <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                    {post.authorDisplayName?.charAt(0).toUpperCase()}
                </div>
                <div>
                    <p className="font-bold text-gray-800">{post.authorDisplayName}</p>
                    <p className="text-xs text-gray-500">{formatRelativeTime(post.createdAt as Timestamp)}</p>
                </div>
            </div>

            {/* Content */}
            {post.content && <p className="px-4 pb-3 text-gray-700 whitespace-pre-wrap">{post.content}</p>}
            {post.imageUrl && <img src={post.imageUrl} alt="Post content" className="w-full h-auto max-h-96 object-cover" />}

            {/* Actions */}
            <div className="flex justify-around p-2 border-t border-gray-100">
                <button onClick={hapticTap} className="flex items-center gap-2 text-gray-600 hover:text-red-500 p-2 rounded-lg transition-colors">
                    <Heart size={20} />
                    <span className="text-sm font-semibold">{post.likes.length}</span>
                </button>
                <button onClick={hapticTap} className="flex items-center gap-2 text-gray-600 hover:text-blue-500 p-2 rounded-lg transition-colors">
                    <MessageCircle size={20} />
                     <span className="text-sm font-semibold">{post.commentCount}</span>
                </button>
                <button onClick={hapticTap} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 p-2 rounded-lg transition-colors">
                    <MoreHorizontal size={20} />
                </button>
            </div>
        </div>
    );
};

export default PostCard;