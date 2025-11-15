import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Activity, ShieldCheck, Dumbbell, Share2 } from 'lucide-react';
import { BodyScan } from '../types';
import { hapticTap } from '../utils/haptics';

const BodyScanDetailScreen: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { scan } = location.state as { scan: BodyScan };

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
    
    const ratingColor = scan.results.bodyRating > 7 ? 'text-green-500' : scan.results.bodyRating > 4 ? 'text-yellow-500' : 'text-red-500';
    
    const handleShare = () => {
        hapticTap();
        const shareContent = `Just did a body scan with LevelUp! 💪\nMy posture is rated as "${scan.results.postureAnalysis}" and my estimated body fat is ${scan.results.bodyFatPercentage.toFixed(1)}%. Ready to improve! #LevelUp #FitnessJourney #BodyScan`;
        
        navigate('/create-post', { 
            state: { 
                shareData: {
                    content: shareContent,
                    imageUrl: scan.image_url,
                }
            } 
        });
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="sticky top-0 bg-white/80 backdrop-blur-sm z-10 p-4 flex items-center border-b border-gray-200">
                <button onClick={() => { hapticTap(); navigate(-1); }} className="p-2 rounded-full hover:bg-gray-100">
                    <ArrowLeft size={24} className="text-gray-800" />
                </button>
                <h1 className="text-xl font-bold text-gray-900 mx-auto">Scan Details</h1>
                <div className="w-8"></div>
            </header>

            <main className="p-4 space-y-5 pb-24">
                <img src={scan.image_url} alt="Body Scan" className="w-full h-64 object-cover rounded-xl shadow-lg" />

                <div className="text-center">
                    <h2 className="text-3xl font-bold text-gray-800">Body Analysis</h2>
                     <div className="flex items-center justify-center text-md text-gray-500 mt-2">
                        <Calendar size={16} className="mr-2" />
                        <span>{formatDate(scan.created_at)}</span>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                     <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                        <p className="font-semibold text-gray-500 text-sm">Overall Rating</p>
                        <p className={`text-5xl font-extrabold ${ratingColor}`}>{scan.results.bodyRating.toFixed(1)}<span className="text-2xl">/10</span></p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                        <p className="font-semibold text-gray-500 text-sm">Body Fat (Est.)</p>
                        <p className="text-5xl font-extrabold text-blue-500">{scan.results.bodyFatPercentage.toFixed(1)}<span className="text-2xl">%</span></p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-100 p-2 rounded-full"><Activity className="w-6 h-6 text-purple-600" /></div>
                        <div>
                            <p className="font-semibold text-gray-500 text-sm">Posture Analysis</p>
                            <p className="text-lg font-bold text-gray-800">{scan.results.postureAnalysis}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm">
                     <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Dumbbell size={18} /> Recommendations</h3>
                     <ul className="space-y-2">
                        {scan.results.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start gap-3">
                                <ShieldCheck className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-700">{rec}</span>
                            </li>
                        ))}
                    </ul>
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

export default BodyScanDetailScreen;