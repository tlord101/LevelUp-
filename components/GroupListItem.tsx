import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { hapticTap } from '../utils/haptics';
import { Group } from '../types';

const GroupListItem: React.FC<{ group: Group }> = ({ group }) => {
    const navigate = useNavigate();

    const handleGroupClick = () => {
        hapticTap();
        navigate(`/groups/${group.id}`);
    };

    return (
        <div onClick={handleGroupClick} className="flex items-center p-3 -m-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
            <div className="text-3xl bg-gray-100 p-2 rounded-lg mr-4">{group.icon}</div>
            <div className="flex-grow">
                <p className="font-semibold text-gray-800">{group.name}</p>
                 <p className="text-xs text-gray-500">{group.members.length} member{group.members.length !== 1 ? 's' : ''}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
    );
};

export default GroupListItem;
