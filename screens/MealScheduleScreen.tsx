import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar as CalendarIcon, Utensils, Edit2, CheckCircle2, Clock, Trash2, Save, X, Loader2, Circle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getNutritionLogsForDate, deleteNutritionLog, updateNutritionLog } from '../services/firebaseService';
import { NutritionLog } from '../types';
import { hapticTap, hapticSuccess, hapticError } from '../utils/haptics';

const MealScheduleScreen: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [logs, setLogs] = useState<NutritionLog[]>([]);
    const [loading, setLoading] = useState(true);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingLog, setEditingLog] = useState<NutritionLog | null>(null);
    const [editFormData, setEditFormData] = useState({
        food_name: '',
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
    });
    const [isSaving, setIsSaving] = useState(false);

    // Generate the next 7 days for the date strip
    const weekDates = useMemo(() => {
        const dates = [];
        // Start from 2 days ago to show context
        const start = new Date();
        start.setDate(start.getDate() - 2);
        
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            dates.push(d);
        }
        return dates;
    }, []);

    const fetchLogs = useCallback(async () => {
        if (user) {
            setLoading(true);
            try {
                const fetchedLogs = await getNutritionLogsForDate(user.uid, selectedDate);
                setLogs(fetchedLogs);
            } catch (error) {
                console.error("Failed to fetch logs for date:", error);
            } finally {
                setLoading(false);
            }
        }
    }, [user, selectedDate]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const getMealLabel = (dateString: string) => {
        const date = new Date(dateString);
        const hours = date.getHours();
        if (hours < 11) return 'Breakfast';
        if (hours < 15) return 'Lunch';
        if (hours < 18) return 'Snack';
        return 'Dinner';
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    };

    // Group logs by meal label to avoid duplicate timeline entries
    const groupedLogs = useMemo(() => {
        const groups: Record<string, NutritionLog[]> = {};
        
        // Sort logs by time first
        const sortedLogs = [...logs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        sortedLogs.forEach(log => {
            const label = getMealLabel(log.created_at);
            if (!groups[label]) {
                groups[label] = [];
            }
            groups[label].push(log);
        });

        // Define standard order of meals
        const mealOrder = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];
        
        // Map to array in correct order
        return mealOrder.map(label => ({
            label,
            items: groups[label] || []
        })).filter(group => group.items.length > 0);
    }, [logs]);

    const handleToggleConsumed = async (log: NutritionLog) => {
        hapticTap();
        try {
            const isCurrentlyConsumed = log.consumed !== false;
            await updateNutritionLog(log.id, { consumed: !isCurrentlyConsumed });
            hapticSuccess();
            
            // Optimistically update local state
            setLogs(prev => prev.map(l => l.id === log.id ? { ...l, consumed: !isCurrentlyConsumed } : l));
        } catch (error) {
            console.error("Failed to toggle meal status:", error);
            hapticError();
        }
    };

    const handleEditClick = (log: NutritionLog) => {
        hapticTap();
        setEditingLog(log);
        setEditFormData({
            food_name: log.food_name,
            calories: log.calories,
            protein: log.protein,
            carbs: log.carbs,
            fat: log.fat
        });
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingLog) return;
        setIsSaving(true);
        hapticTap();
        try {
            await updateNutritionLog(editingLog.id, editFormData);
            hapticSuccess();
            setIsEditModalOpen(false);
            fetchLogs(); // Refresh UI
        } catch (error) {
            console.error("Failed to update log:", error);
            hapticError(); 
            alert("Failed to update meal.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteLog = async () => {
        if (!editingLog) return;
        if (!window.confirm("Are you sure you want to delete this meal?")) return;
        
        setIsSaving(true);
        hapticTap();
        try {
            await deleteNutritionLog(editingLog.id);
            hapticSuccess();
            setIsEditModalOpen(false);
            fetchLogs(); // Refresh UI
        } catch (error) {
            console.error("Failed to delete log:", error);
            hapticError();
            alert("Failed to delete meal.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-white relative">
            {/* Header */}
            <header className="sticky top-0 bg-white/90 backdrop-blur-sm z-20 pt-4 pb-2 px-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => { hapticTap(); navigate(-1); }} className="p-2 rounded-full hover:bg-gray-100">
                        <ArrowLeft size={20} className="text-gray-800" />
                    </button>
                    <h1 className="text-lg font-bold text-gray-900">Meal Schedule</h1>
                    <button onClick={() => { hapticTap(); navigate('/nutrition-tracker'); }} className="p-2 rounded-full hover:bg-gray-100">
                         <Utensils size={20} className="text-gray-800" />
                    </button>
                </div>
                
                {/* Date Strip */}
                <div className="flex justify-between items-center overflow-x-auto pb-2 gap-2 no-scrollbar">
                    {weekDates.map((date, idx) => {
                        const isSelected = date.toDateString() === selectedDate.toDateString();
                        
                        return (
                            <button
                                key={idx}
                                onClick={() => { hapticTap(); setSelectedDate(date); }}
                                className={`flex flex-col items-center justify-center min-w-[3.5rem] py-3 rounded-2xl transition-all duration-200 ${
                                    isSelected 
                                    ? 'bg-orange-500 text-white shadow-md scale-105' 
                                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                }`}
                            >
                                <span className="text-xs font-bold uppercase">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                <span className="text-lg font-bold">{date.getDate()}</span>
                            </button>
                        );
                    })}
                </div>
            </header>

            {/* Main Content */}
            <main className="p-4 space-y-6 pb-24">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                    </div>
                ) : groupedLogs.length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CalendarIcon size={32} className="text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">No meals planned</h3>
                        <p className="text-sm text-gray-500 mt-1">Tap + to add a meal or scan one.</p>
                    </div>
                ) : (
                    groupedLogs.map((group, groupIdx) => (
                        <div key={groupIdx} className="animate-fade-in-up" style={{ animationDelay: `${groupIdx * 100}ms` }}>
                            <h3 className="font-bold text-gray-500 uppercase text-xs tracking-wider mb-3 flex items-center gap-2">
                                <Clock size={14} /> {group.label}
                            </h3>
                            <div className="space-y-3">
                                {group.items.map(log => (
                                    <div 
                                        key={log.id} 
                                        className={`bg-white p-4 rounded-2xl shadow-sm border transition-all duration-300 ${
                                            log.consumed 
                                            ? 'border-green-200 bg-green-50/30' 
                                            : 'border-gray-100'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <button 
                                                    onClick={() => handleToggleConsumed(log)}
                                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                        log.consumed 
                                                        ? 'bg-green-500 border-green-500 text-white' 
                                                        : 'border-gray-300 text-transparent hover:border-purple-400'
                                                    }`}
                                                >
                                                    <CheckCircle2 size={16} />
                                                </button>
                                                <div>
                                                    <h4 className={`font-bold text-gray-800 ${log.consumed ? 'line-through text-gray-400' : ''}`}>
                                                        {log.food_name}
                                                    </h4>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        {log.calories} kcal • {formatTime(log.created_at)}
                                                    </p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleEditClick(log)}
                                                className="p-2 text-gray-400 hover:text-purple-600 transition"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </main>

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-fade-in-up">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Edit Meal</h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 rounded-full hover:bg-gray-100">
                                <X size={20} className="text-gray-600" />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Food Name</label>
                                <input
                                    type="text"
                                    value={editFormData.food_name}
                                    onChange={(e) => setEditFormData({...editFormData, food_name: e.target.value})}
                                    className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Calories</label>
                                    <input
                                        type="number"
                                        value={editFormData.calories}
                                        onChange={(e) => setEditFormData({...editFormData, calories: Number(e.target.value)})}
                                        className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Protein (g)</label>
                                    <input
                                        type="number"
                                        value={editFormData.protein}
                                        onChange={(e) => setEditFormData({...editFormData, protein: Number(e.target.value)})}
                                        className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Carbs (g)</label>
                                    <input
                                        type="number"
                                        value={editFormData.carbs}
                                        onChange={(e) => setEditFormData({...editFormData, carbs: Number(e.target.value)})}
                                        className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fat (g)</label>
                                    <input
                                        type="number"
                                        value={editFormData.fat}
                                        onChange={(e) => setEditFormData({...editFormData, fat: Number(e.target.value)})}
                                        className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button 
                                    onClick={handleDeleteLog}
                                    disabled={isSaving}
                                    className="flex-1 bg-red-50 text-red-600 font-bold py-3 rounded-xl hover:bg-red-100 transition flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={18} /> Delete
                                </button>
                                <button 
                                    onClick={handleSaveEdit}
                                    disabled={isSaving}
                                    className="flex-[2] bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 transition flex items-center justify-center gap-2 shadow-md"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" /> : <Save size={18} />} Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MealScheduleScreen;