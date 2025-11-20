
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar as CalendarIcon, Utensils, Edit2, CheckCircle2, Clock, Trash2, Save, X, Loader2, Circle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getNutritionLogsForDate, deleteNutritionLog, updateNutritionLog } from '../services/supabaseService';
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
                const fetchedLogs = await getNutritionLogsForDate(user.id, selectedDate);
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
                        const isToday = date.toDateString() === new Date().toDateString();
                        
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
                                <span className="text-xs font-medium mb-1">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                <span className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                                    {date.getDate()}
                                </span>
                                {isToday && !isSelected && <span className="w-1 h-1 rounded-full bg-orange-500 mt-1"></span>}
                            </button>
                        );
                    })}
                </div>
            </header>

            {/* Timeline Content */}
            <main className="p-4 min-h-[600px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <Clock className="animate-spin w-8 h-8 mb-2" />
                        <p>Loading schedule...</p>
                    </div>
                ) : groupedLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/50 mt-4">
                        <CalendarIcon className="w-12 h-12 mb-3 text-gray-300" />
                        <p className="font-medium">No meals scheduled</p>
                        <p className="text-xs">Generate a plan in the Tracker</p>
                    </div>
                ) : (
                    <div className="relative pl-4 space-y-8 mt-2">
                        {/* Vertical Line */}
                        <div className="absolute left-[5.5rem] top-2 bottom-0 w-px bg-gray-200"></div>

                        {groupedLogs.map((group, index) => {
                            const firstItemTime = formatTime(group.items[0].created_at);
                            const totalCalories = group.items.reduce((sum, item) => sum + item.calories, 0);
                            
                            // Determine if we should show a single card or a group card
                            const isSingleItem = group.items.length === 1;

                            return (
                                <div key={group.label} className="relative flex items-start gap-6 animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
                                    {/* Left Time Column */}
                                    <div className="w-16 text-right pt-3 flex-shrink-0">
                                        <p className="font-bold text-gray-900 text-sm">{group.label}</p>
                                        <p className="text-xs text-gray-400">{firstItemTime}</p>
                                    </div>

                                    {/* Timeline Dot */}
                                    <div className="absolute left-[5.25rem] top-4 w-3 h-3 rounded-full bg-orange-500 ring-4 ring-white z-10"></div>

                                    {/* Content */}
                                    {isSingleItem ? (
                                        // Single Item View (Standalone Card)
                                        <div className={`flex-grow p-4 rounded-2xl shadow-sm border group transition-transform active:scale-[0.98] flex justify-between items-start ${
                                            group.items[0].consumed !== false ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'
                                        }`}>
                                            <div>
                                                <p className={`font-bold text-lg capitalize leading-tight mb-1 ${group.items[0].consumed !== false ? 'text-green-800' : 'text-gray-900'}`}>
                                                    {group.items[0].food_name}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-bold ${group.items[0].consumed !== false ? 'text-green-600' : 'text-orange-500'}`}>{group.items[0].calories} kcal</span>
                                                    <span className="text-gray-300">|</span>
                                                    <div className="flex gap-2 text-xs text-gray-500">
                                                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span> {group.items[0].protein}g P</span>
                                                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> {group.items[0].carbs}g C</span>
                                                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span> {group.items[0].fat}g F</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <button 
                                                    onClick={() => handleToggleConsumed(group.items[0])}
                                                    className={`p-2 rounded-full transition-colors ${group.items[0].consumed !== false ? 'text-green-500 hover:bg-green-100' : 'text-gray-300 hover:bg-gray-100'}`}
                                                >
                                                    {group.items[0].consumed !== false ? <CheckCircle2 size={24} className="fill-current" /> : <Circle size={24} />}
                                                </button>
                                                <button 
                                                    onClick={() => handleEditClick(group.items[0])}
                                                    className="text-gray-300 hover:text-purple-600 transition-colors p-2"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        // Group View (Summary Card)
                                        <div className="flex-grow bg-white p-4 rounded-2xl shadow-sm border border-gray-100 group transition-transform active:scale-[0.98]">
                                            <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-50">
                                                <div className="flex items-center gap-2">
                                                     <div className="p-1.5 bg-orange-100 rounded-lg">
                                                        <Utensils size={14} className="text-orange-600" />
                                                     </div>
                                                     <span className="font-bold text-gray-800">{totalCalories} kcal total</span>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                {group.items.map(item => (
                                                    <div key={item.id} className={`flex justify-between items-center p-2 rounded-lg transition-colors ${item.consumed !== false ? 'bg-green-50/50' : ''}`}>
                                                        <div>
                                                            <p className={`font-medium capitalize ${item.consumed !== false ? 'text-green-800 line-through decoration-green-500/50' : 'text-gray-900'}`}>
                                                                {item.food_name}
                                                            </p>
                                                            <div className="flex gap-2 text-xs text-gray-500 mt-0.5">
                                                                <span>{item.calories} kcal</span>
                                                                <span>•</span>
                                                                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span> {item.protein}g P</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button 
                                                                onClick={() => handleToggleConsumed(item)}
                                                                className={`p-1.5 rounded-full transition-colors ${item.consumed !== false ? 'text-green-500 hover:bg-green-100' : 'text-gray-300 hover:bg-gray-100'}`}
                                                            >
                                                                {item.consumed !== false ? <CheckCircle2 size={20} className="fill-current" /> : <Circle size={20} />}
                                                            </button>
                                                            <button 
                                                                onClick={() => handleEditClick(item)}
                                                                className="text-gray-300 hover:text-purple-600 transition-colors p-1.5"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Edit Modal */}
            {isEditModalOpen && editingLog && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-fade-in-up relative">
                        <button onClick={() => setIsEditModalOpen(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-500">
                            <X size={20} />
                        </button>

                        <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Meal</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Food Name</label>
                                <input 
                                    type="text"
                                    value={editFormData.food_name}
                                    onChange={(e) => setEditFormData({...editFormData, food_name: e.target.value})}
                                    className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-purple-500 text-gray-900 font-medium"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Calories</label>
                                    <input 
                                        type="number"
                                        value={editFormData.calories}
                                        onChange={(e) => setEditFormData({...editFormData, calories: Number(e.target.value)})}
                                        className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Protein (g)</label>
                                    <input 
                                        type="number"
                                        value={editFormData.protein}
                                        onChange={(e) => setEditFormData({...editFormData, protein: Number(e.target.value)})}
                                        className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Carbs (g)</label>
                                    <input 
                                        type="number"
                                        value={editFormData.carbs}
                                        onChange={(e) => setEditFormData({...editFormData, carbs: Number(e.target.value)})}
                                        className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Fat (g)</label>
                                    <input 
                                        type="number"
                                        value={editFormData.fat}
                                        onChange={(e) => setEditFormData({...editFormData, fat: Number(e.target.value)})}
                                        className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button 
                                    onClick={handleDeleteLog}
                                    disabled={isSaving}
                                    className="flex-1 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Trash2 size={18} />}
                                    Delete
                                </button>
                                <button 
                                    onClick={handleSaveEdit}
                                    disabled={isSaving}
                                    className="flex-[2] py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />}
                                    Save Changes
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
