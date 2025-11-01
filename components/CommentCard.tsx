import React from 'react';
import { Comment } from '../types';
import { formatRelativeTime } from '../utils/formatDate';

interface CommentCardProps {
    comment: Comment;
}

const CommentCard: React.FC<CommentCardProps> = ({ comment }) => {
    return (
        <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {comment.author_display_name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-grow bg-gray-100 rounded-lg px-3 py-2">
                <div className="flex items-baseline gap-2">
                    <p className="font-bold text-sm text-gray-800">{comment.author_display_name}</p>
                    <p className="text-xs text-gray-500">{formatRelativeTime(comment.created_at)}</p>
                </div>
                <p className="text-sm text-gray-700">{comment.content}</p>
            </div>
        </div>
    );
};

export default CommentCard;
