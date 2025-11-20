import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar as CalendarIcon, Utensils, Edit2, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getNutritionLogsForDate } from '../services/supabaseService';
import { NutritionLog } from '../types';
import { hapticTap } from '../utils/haptics';

const MealScheduleScreen: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [logs, setLogs] = useState<NutritionLog[]>([]);
    const [loading, setLoading] = useState(true);

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

    useEffect(() => {
        const fetchLogs = async () => {
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
        };
        fetchLogs();
    }, [user, selectedDate]);

    // Group logs by time for timeline (Breakfast, Lunch, Dinner, etc.)
    // For simplicity, we'll bucket them into hours or "Meal Times" based on timestamp
    // Or simply display them in chronological order on a timeline
    
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

    return (
        <div className="min-h-screen bg-white">
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
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/50 mt-4">
                        <CalendarIcon className="w-12 h-12 mb-3 text-gray-300" />
                        <p className="font-medium">No meals scheduled</p>
                        <p className="text-xs">Generate a plan in the Tracker</p>
                    </div>
                ) : (
                    <div className="relative pl-4 space-y-8 mt-2">
                        {/* Vertical Line */}
                        <div className="absolute left-[5.5rem] top-2 bottom-0 w-px bg-gray-200"></div>

                        {logs.map((log, index) => {
                            const mealLabel = getMealLabel(log.created_at);
                            const timeLabel = formatTime(log.created_at);
                            
                            // Calculate total calories for the day so far (just for fun context, or skip)
                            // Let's stick to the card design
                            
                            return (
                                <div key={log.id} className="relative flex items-start gap-6 animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
                                    {/* Left Time Column */}
                                    <div className="w-16 text-right pt-3 flex-shrink-0">
                                        <p className="font-bold text-gray-900 text-sm">{mealLabel}</p>
                                        <p className="text-xs text-gray-400">{timeLabel}</p>
                                    </div>

                                    {/* Timeline Dot */}
                                    <div className="absolute left-[5.25rem] top-4 w-3 h-3 rounded-full bg-orange-500 ring-4 ring-white z-10"></div>

                                    {/* Meal Card */}
                                    <div className="flex-grow bg-white p-4 rounded-2xl shadow-sm border border-gray-100 group transition-transform active:scale-[0.98]">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                 <div className="p-1.5 bg-orange-100 rounded-lg">
                                                    <Utensils size={14} className="text-orange-600" />
                                                 </div>
                                                 <span className="font-bold text-gray-800">{log.calories} kcal</span>
                                            </div>
                                            <CheckCircle2 size={16} className="text-green-500" />
                                        </div>
                                        
                                        <h3 className="font-bold text-gray-900 text-lg mb-2 capitalize">{log.food_name}</h3>
                                        
                                        <div className="flex items-center gap-3 text-xs font-medium text-gray-500 bg-gray-50 p-2 rounded-lg inline-flex">
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-400"></span> {log.protein}g P</span>
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"></span> {log.fat}g F</span>
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400"></span> {log.carbs}g C</span>
                                        </div>
                                        
                                        <button className="absolute bottom-4 right-4 p-1.5 text-gray-300 hover:text-gray-600 transition-colors">
                                            <Edit2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

export default MealScheduleScreen;