import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { createComment, getCommentsForPost } from '../services/supabaseService';
import { Comment } from '../types';
import { Loader2, Send } from 'lucide-react';
import { hapticTap, hapticError, hapticSuccess } from '../utils/haptics';
import CommentCard from './CommentCard';

interface CommentSectionProps {
    postId: string;
    onCommentPosted: () => void;
}

const CommentSection: React.FC<CommentSectionProps> = ({ postId, onCommentPosted }) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const { user, userProfile } = useAuth();

    useEffect(() => {
        const fetchComments = async () => {
            try {
                const fetchedComments = await getCommentsForPost(postId);
                setComments(fetchedComments);
            } catch (error) {
                console.error("Failed to fetch comments:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchComments();
    }, [postId]);

    const handlePostComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !user || !userProfile?.display_name) {
            hapticError();
            return;
        }

        setIsPosting(true);
        hapticTap();

        try {
            const createdComment = await createComment(postId, user.id, userProfile.display_name, newComment.trim());
            setComments(prevComments => [...prevComments, createdComment]);
            setNewComment('');
            onCommentPosted(); // Notify parent to update count
            hapticSuccess();
        } catch (error) {
            console.error("Failed to post comment:", error);
            alert("Could not post your comment. Please try again.");
            hapticError();
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <div className="p-4 border-t border-gray-100">
            {/* Comment List */}
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {loading ? (
                    <div className="flex justify-center items-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                ) : comments.length > 0 ? (
                    comments.map(comment => <CommentCard key={comment.id} comment={comment} />)
                ) : (
                    <p className="text-sm text-center text-gray-500 py-4">No comments yet. Be the first to reply!</p>
                )}
            </div>

            {/* Comment Input Form */}
            {user && (
                 <form onSubmit={handlePostComment} className="flex items-start gap-3">
                     <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-1">
                        {userProfile?.display_name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="relative flex-grow">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a comment..."
                            className="w-full p-2 pr-12 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 resize-none text-sm transition"
                            rows={1}
                            disabled={isPosting}
                        />
                        <button
                            type="submit"
                            disabled={isPosting || !newComment.trim()}
                            className="absolute top-1/2 right-2 -translate-y-1/2 p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed"
                        >
                            {isPosting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default CommentSection;