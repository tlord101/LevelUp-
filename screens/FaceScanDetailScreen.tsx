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
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <AnalysisItem label="Hydration" value={scan.results.skinAnalysis.hydration} icon={Droplets} />
                    <AnalysisItem label="Clarity" value={scan.results.skinAnalysis.clarity} icon={Wind} />
                    <AnalysisItem label="Radiance" value={scan.results.skinAnalysis.radiance} icon={Sun} />
                </div>
                
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