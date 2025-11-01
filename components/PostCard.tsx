import React, { useState } from 'react';
import { Heart, MessageCircle, MoreHorizontal } from 'lucide-react';
import { hapticTap } from '../utils/haptics';
import { Post } from '../types';
import { formatRelativeTime } from '../utils/formatDate';
import { useAuth } from '../context/AuthContext';
import { likePost, unlikePost } from '../services/supabaseService';
import CommentSection from './CommentSection';


const PostCard: React.FC<{ post: Post }> = ({ post }) => {
    const { user } = useAuth();
    // Initialize state from props to reflect if the current user has liked the post
    const [isLiked, setIsLiked] = useState(user ? post.likes.includes(user.id) : false);
    const [likeCount, setLikeCount] = useState(post.likes.length);
    const [commentCount, setCommentCount] = useState(post.comment_count);
    const [commentsVisible, setCommentsVisible] = useState(false);


    const handleLikeToggle = async () => {
        if (!user) {
            alert("You need to be logged in to like posts.");
            return;
        }
        hapticTap();

        // Optimistic UI update for a responsive feel
        const originalIsLiked = isLiked;
        const originalLikeCount = likeCount;

        setIsLiked(!isLiked);
        setLikeCount(likeCount + (!isLiked ? 1 : -1));

        try {
            if (!isLiked) {
                await likePost(post.id);
            } else {
                await unlikePost(post.id);
            }
        } catch (error: any) {
            console.error("Failed to update like status:", error);
            // Revert UI on API call failure
            setIsLiked(originalIsLiked);
            setLikeCount(originalLikeCount);
            const errorMessage = error?.message || "Could not update like status. Please try again.";
            alert(errorMessage);
        }
    };

    const handleCommentPosted = () => {
        // Optimistically update the comment count
        setCommentCount(prev => prev + 1);
    };

    const toggleComments = () => {
        hapticTap();
        setCommentsVisible(!commentsVisible);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm">
            {/* Header */}
            <div className="flex items-center p-4 gap-3">
                 <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                    {post.author_display_name?.charAt(0).toUpperCase()}
                </div>
                <div>
                    <p className="font-bold text-gray-800">{post.author_display_name}</p>
                    <p className="text-xs text-gray-500">{formatRelativeTime(post.created_at)}</p>
                </div>
            </div>

            {/* Content */}
            {post.content && <p className="px-4 pb-3 text-gray-700 whitespace-pre-wrap">{post.content}</p>}
            {post.image_url && <img src={post.image_url} alt="Post content" className="w-full h-auto max-h-96 object-cover" />}

            {/* Actions */}
            <div className="flex justify-around p-2 border-t border-gray-100">
                <button 
                    onClick={handleLikeToggle} 
                    className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                        isLiked ? 'text-red-500' : 'text-gray-600 hover:text-red-500'
                    }`}
                >
                    <Heart size={20} className={isLiked ? 'fill-current' : ''} />
                    <span className="text-sm font-semibold">{likeCount}</span>
                </button>
                <button onClick={toggleComments} className="flex items-center gap-2 text-gray-600 hover:text-blue-500 p-2 rounded-lg transition-colors">
                    <MessageCircle size={20} />
                     <span className="text-sm font-semibold">{commentCount}</span>
                </button>
                <button onClick={hapticTap} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 p-2 rounded-lg transition-colors">
                    <MoreHorizontal size={20} />
                </button>
            </div>
             {/* Comment Section */}
            {commentsVisible && (
                <CommentSection postId={post.id} onCommentPosted={handleCommentPosted} />
            )}
        </div>
    );
};

export default PostCard;