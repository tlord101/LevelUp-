import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Sparkles, Droplets, Sun, Wind, ShieldCheck, Search, Share2 } from 'lucide-react';
import { FaceScan, ProductRecommendation } from '../types';
import { hapticTap } from '../utils/haptics';

const FaceScanDetailScreen: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { scan } = location.state as { scan: FaceScan };

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
    
    const ratingColor = scan.results.skinRating > 7 ? 'text-pink-500' : scan.results.skinRating > 4 ? 'text-yellow-500' : 'text-red-500';

    const handleSearchProduct = (productName: string) => {
        hapticTap();
        const query = encodeURIComponent(productName);
        window.open(`https://www.google.com/search?q=${query}`, '_blank');
    };

    const handleShare = () => {
        hapticTap();
        const shareContent = `Just did a skin scan with LevelUp! ✨\nMy skin radiance is looking ${scan.results.skinAnalysis.radiance.toLowerCase()} and clarity is ${scan.results.skinAnalysis.clarity.toLowerCase()}. Time to glow! #LevelUp #Skincare #GlowUp`;
        
        navigate('/create-post', { 
            state: { 
                shareData: {
                    content: shareContent,
                    imageUrl: scan.image_url,
                }
            } 
        });
    };

    const AnalysisItem: React.FC<{ label: string, value: string, icon: React.ElementType }> = ({ label, value, icon: Icon }) => (
        <div className="flex items-center gap-4 bg-gray-100 p-3 rounded-lg">
            <Icon className="w-6 h-6 text-gray-500" />
            <div>
                <p className="text-xs font-semibold text-gray-500">{label}</p>
                <p className="text-md font-bold text-gray-800">{value}</p>
            </div>
        </div>
    );

    const RecommendationCard: React.FC<{ rec: ProductRecommendation }> = ({ rec }) => (
        <div className="bg-gray-100/70 p-4 rounded-lg">
            <p className="font-bold text-gray-800">{rec.productName}</p>
            <p className="text-xs font-semibold text-purple-600 bg-purple-100 inline-block px-2 py-0.5 rounded-full my-1">{rec.productType}</p>
            <p className="text-sm text-gray-600 mt-1 mb-3">{rec.reason}</p>
            <button
                onClick={() => handleSearchProduct(rec.productName)}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-blue-600 bg-blue-100 hover:bg-blue-200 py-2 rounded-md transition-colors"
            >
                <Search size={16}/>
                Search Online
            </button>
        </div>
    );


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
                <img src={scan.image_url} alt="Face Scan" className="w-full h-64 object-cover rounded-xl shadow-lg" />
                
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-gray-800">Skin Analysis</h2>
                     <div className="flex items-center justify-center text-md text-gray-500 mt-2">
                        <Calendar size={16} className="mr-2" />
                        <span>{formatDate(scan.created_at)}</span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                    <p className="font-semibold text-gray-500 text-sm">Overall Skin Rating</p>
                    <p className={`text-6xl font-extrabold ${ratingColor}`}>{scan.results.skinRating.toFixed(1)}<span className="text-3xl">/10</span></p>
                </div>

                <div className="bg-linear-to-r from-slate-900 to-slate-700 rounded-xl p-4 text-white">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs uppercase tracking-wider text-slate-300">AI Summary</p>
                            <p className="font-semibold mt-1">{scan.results.summaryTitle || 'Skin Health Snapshot'}</p>
                            <p className="text-xs text-slate-200 mt-2">{scan.results.comparisonSummary || 'No previous comparison available.'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-300">Confidence</p>
                            <p className="text-2xl font-extrabold">{Math.round(scan.results.confidence || 75)}%</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-2">Skin Condition</h3>
                    <p className="text-sm text-gray-700">{scan.results.skinCondition || 'No condition summary provided.'}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <AnalysisItem label="Hydration" value={scan.results.skinAnalysis.hydration} icon={Droplets} />
                    <AnalysisItem label="Clarity" value={scan.results.skinAnalysis.clarity} icon={Wind} />
                    <AnalysisItem label="Radiance" value={scan.results.skinAnalysis.radiance} icon={Sun} />
                </div>

                {(scan.results.skinAnalysis.texture || scan.results.skinAnalysis.tone) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {scan.results.skinAnalysis.texture && (
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">Texture</p>
                                <p className="text-sm font-medium text-gray-800">{scan.results.skinAnalysis.texture}</p>
                            </div>
                        )}
                        {scan.results.skinAnalysis.tone && (
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">Tone Evenness</p>
                                <p className="text-sm font-medium text-gray-800">{scan.results.skinAnalysis.tone}</p>
                            </div>
                        )}
                    </div>
                )}

                {scan.results.visibleConcerns && scan.results.visibleConcerns.length > 0 && (
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-3">Visible Concerns</h3>
                        <div className="flex flex-wrap gap-2">
                            {scan.results.visibleConcerns.map((concern, index) => (
                                <span key={index} className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-medium border border-rose-100">
                                    {concern}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {scan.results.dailyPlan && scan.results.dailyPlan.length > 0 && (
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-3">Daily Routine Plan</h3>
                        <div className="space-y-2">
                            {scan.results.dailyPlan.map((step, index) => (
                                <div key={index} className="flex items-start gap-2.5 bg-gray-50 rounded-lg p-2.5">
                                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center mt-0.5">
                                        {index + 1}
                                    </span>
                                    <p className="text-sm text-gray-700">{step}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="bg-white p-4 rounded-xl shadow-sm">
                     <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Sparkles size={18} /> Skincare Recommendations</h3>
                     <div className="space-y-3">
                        {scan.results.recommendations.map((rec, index) => (
                           <RecommendationCard key={index} rec={rec} />
                        ))}
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

export default FaceScanDetailScreen;