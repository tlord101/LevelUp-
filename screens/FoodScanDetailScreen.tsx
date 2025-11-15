import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Flame, Share2 } from 'lucide-react';
import { NutritionScan } from '../types';
import { hapticTap } from '../utils/haptics';

const FoodScanDetailScreen: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { scan } = location.state as { scan: NutritionScan };

    if (!scan) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 text-center">
                <div>
                    <p className="text-lg font-semibold text-gray-700">Scan data not found.</p>
                    <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg">Go Back</button>
                </div>
            </div>
        );
    }

    const formatDate = (dateString: string) => {
        if (!dateString) return 'Just now';
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    const handleShare = () => {
        hapticTap();
        const shareContent = `I just logged a meal with LevelUp! 🍽️\nIt was ${scan.results.foodName} with about ${scan.results.calories.toFixed(0)} calories. #LevelUp #Nutrition #FoodScanner`;
        
        navigate('/create-post', { 
            state: { 
                shareData: {
                    content: shareContent,
                    imageUrl: scan.image_url,
                }
            } 
        });
    };

    const MacroDisplay: React.FC<{ label: string, value: number, color: string }> = ({ label, value, color }) => (
        <div className="flex-1 text-center bg-gray-100 p-4 rounded-lg">
            <p className="text-sm font-semibold text-gray-500">{label}</p>
            <p className={`text-3xl font-bold`} style={{ color }}>{value.toFixed(0)}g</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-white">
            <header className="sticky top-0 bg-white/80 backdrop-blur-sm z-10 p-4 flex items-center border-b border-gray-200">
                <button onClick={() => { hapticTap(); navigate(-1); }} className="p-2 rounded-full hover:bg-gray-100">
                    <ArrowLeft size={24} className="text-gray-800" />
                </button>
                <h1 className="text-xl font-bold text-gray-900 mx-auto">Scan Details</h1>
                <div className="w-8"></div>
            </header>

            <main className="p-4 space-y-5 pb-24">
                <img src={scan.image_url} alt={scan.results.foodName} className="w-full h-64 object-cover rounded-xl shadow-lg" />
                
                <div className="text-center">
                    <h2 className="text-4xl font-bold text-gray-800 capitalize">{scan.results.foodName}</h2>
                    <div className="flex items-center justify-center text-lg text-gray-500 mt-2">
                        <Calendar size={16} className="mr-2" />
                        <span>{formatDate(scan.created_at)}</span>
                    </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                    <Flame className="w-10 h-10 text-orange-500 mb-2" />
                    <p className="text-6xl font-extrabold text-orange-600">{scan.results.calories.toFixed(0)}</p>
                    <p className="font-semibold text-orange-800">Estimated Calories</p>
                </div>
                
                <div>
                    <h3 className="text-lg font-bold text-gray-700 mb-3 text-center">Macronutrients</h3>
                    <div className="flex gap-3">
                        <MacroDisplay label="Protein" value={scan.results.macros.protein} color="#3b82f6" />
                        <MacroDisplay label="Carbs" value={scan.results.macros.carbs} color="#f59e0b" />
                        <MacroDisplay label="Fat" value={scan.results.macros.fat} color="#ec4899" />
                    </div>
                </div>

                 <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                     <button 
                        onClick={handleShare}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-purple-100 text-purple-700 font-semibold rounded-lg hover:bg-purple-200 transition"
                    >
                        <Share2 size={18} />
                        Share to Feed
                    </button>
                </div>
            </main>
        </div>
    );
};

export default FoodScanDetailScreen;