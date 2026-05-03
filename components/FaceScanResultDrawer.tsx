import React, { useState } from 'react';
import { X, Search, Sparkles, Droplets, Calendar, LayoutGrid, ClipboardList, ShoppingBag, ChevronRight, ExternalLink, Sun, Moon } from 'lucide-react';
import { FaceScan, FaceScanResult, ProductRecommendation } from '../types';
import { hapticTap } from '../utils/haptics';

interface FaceScanResultDrawerProps {
  scan: FaceScan;
  onClose: () => void;
  isOpen: boolean;
}

const FaceScanResultDrawer: React.FC<FaceScanResultDrawerProps> = ({ scan, onClose, isOpen }) => {
  const [activeTab, setActiveTab] = useState<'analysis' | 'routine' | 'products'>('analysis');

  if (!isOpen) return null;

  const results = scan.results;

  const handleSearchProduct = (productName: string) => {
    hapticTap();
    const query = encodeURIComponent(productName);
    window.open(`https://www.google.com/search?q=${query}`, '_blank');
  };

  const AnalysisCard = ({ title, value, icon: Icon, colorClass }: { title: string, value: string, icon: any, colorClass: string }) => (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col gap-2">
      <div className={`w-10 h-10 rounded-xl ${colorClass} flex items-center justify-center`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="relative w-full max-w-2xl bg-gray-50 rounded-t-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-slide-up">
        {/* Handle */}
        <div className="w-full flex justify-center p-3">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header with Close */}
        <div className="px-6 flex justify-between items-center mb-2">
          <h2 className="text-2xl font-black text-gray-900">
            {results.summaryTitle || "Scan Results"}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Main Content Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 pb-24">
          {/* Narrative Summary */}
          <div className="bg-purple-600 rounded-3xl p-5 mb-6 text-white shadow-lg shadow-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={20} />
              <span className="font-bold uppercase tracking-wider text-xs">AI Assessment</span>
            </div>
            <p className="text-purple-50 leading-relaxed font-medium">
              {results.comparisonSummary || "Based on your scan, your skin shows great potential. Here's your personalized analysis and roadmap."}
            </p>
          </div>

          {/* Tabs UI */}
          <div className="flex p-1 bg-gray-200 rounded-2xl mb-6">
            <button
              onClick={() => { hapticTap(); setActiveTab('analysis'); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'analysis' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              <LayoutGrid size={18} />
              Analysis
            </button>
            <button
              onClick={() => { hapticTap(); setActiveTab('routine'); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'routine' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              <ClipboardList size={18} />
              Routine
            </button>
            <button
              onClick={() => { hapticTap(); setActiveTab('products'); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'products' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              <ShoppingBag size={18} />
              Products
            </button>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === 'analysis' && (
              <div className="grid grid-cols-2 gap-4">
                <AnalysisCard 
                  title="Hydration" 
                  value={results.skinAnalysis.hydration} 
                  icon={Droplets} 
                  colorClass="bg-blue-500" 
                />
                <AnalysisCard 
                  title="Clarity" 
                  value={results.skinAnalysis.clarity} 
                  icon={Sparkles} 
                  colorClass="bg-emerald-500" 
                />
                <AnalysisCard 
                  title="Radiance" 
                  value={results.skinAnalysis.radiance} 
                  icon={Calendar} 
                  colorClass="bg-orange-500" 
                />
                <AnalysisCard 
                  title="Rating" 
                  value={`${results.skinRating}/10`} 
                  icon={LayoutGrid} 
                  colorClass="bg-pink-500" 
                />
                
                {results.skinCondition && (
                  <div className="col-span-2 bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Primary Condition</p>
                    <p className="text-lg font-bold text-gray-900">{results.skinCondition}</p>
                  </div>
                )}
                
                {results.visibleConcerns && results.visibleConcerns.length > 0 && (
                  <div className="col-span-2 bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Visible Concerns</p>
                    <div className="flex flex-wrap gap-2">
                      {results.visibleConcerns.map((concern, idx) => (
                        <span key={idx} className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold border border-red-100">
                          {concern}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'routine' && (
              <div className="space-y-6">
                {results.dailyPlan ? (
                  <>
                    {/* Morning Section */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                          <Sun size={18} />
                        </div>
                        <h3 className="font-bold text-gray-900">Morning Routine</h3>
                      </div>
                      <div className="space-y-4">
                        {results.dailyPlan.morning.map((item, idx) => (
                          <div key={idx} className="flex gap-4 items-start bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                            <div className="w-6 h-6 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="text-gray-900 font-bold text-sm">{item.step}</p>
                              <p className="text-gray-500 text-xs mt-1 leading-relaxed">{item.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Evening Section */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                          <Moon size={18} />
                        </div>
                        <h3 className="font-bold text-gray-900">Evening Routine</h3>
                      </div>
                      <div className="space-y-4">
                        {results.dailyPlan.evening.map((item, idx) => (
                          <div key={idx} className="flex gap-4 items-start bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                            <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="text-gray-900 font-bold text-sm">{item.step}</p>
                              <p className="text-gray-500 text-xs mt-1 leading-relaxed">{item.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-gray-500 py-8">No daily routine generated. Try scanning again.</p>
                )}
              </div>
            )}

            {activeTab === 'products' && (
              <div className="space-y-4">
                {results.recommendations.map((rec, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs group">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-purple-500 bg-purple-50 px-2 py-0.5 rounded-md">
                          {rec.productType}
                        </span>
                        <h4 className="text-lg font-bold text-gray-900 mt-1">{rec.productName}</h4>
                      </div>
                      <button 
                        onClick={() => handleSearchProduct(rec.productName)}
                        className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                      >
                        <ExternalLink size={18} />
                      </button>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">{rec.reason}</p>
                    <button
                      onClick={() => handleSearchProduct(rec.productName)}
                      className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-gray-800 transition-all active:scale-[0.98]"
                    >
                      <Search size={16} />
                      Shop {rec.productName}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceScanResultDrawer;
