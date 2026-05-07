import React, { useState } from 'react';
import { X, Sparkles, Droplets, LayoutGrid, ClipboardList, ShoppingBag, ExternalLink, Sun, Moon, ShoppingCart } from 'lucide-react';
import { FaceScan, ProductRecommendation } from '../types';
import { hapticTap } from '../utils/haptics';

interface FaceScanResultDrawerProps {
  scan: FaceScan;
  onClose: () => void;
  isOpen: boolean;
}

const ActivityIcon = ({ className, size }: { className?: string, size?: number }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width={size || 24} 
        height={size || 24} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
);

const MetricCard = ({ title, value, icon: Icon, color }: { title: string, value: string, icon: any, color: 'cyan' | 'blue' | 'indigo' | 'emerald' }) => {
    const colors = {
        cyan: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10 shadow-[0_0_15px_rgba(34,211,238,0.1)]',
        blue: 'text-blue-400 border-blue-500/30 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.1)]',
        indigo: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10 shadow-[0_0_15px_rgba(129,140,248,0.1)]',
        emerald: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_15px_rgba(52,211,153,0.1)]'
    };
    return (
        <div className={`p-4 rounded-2xl border ${colors[color]} flex flex-col items-center justify-center text-center space-y-2 backdrop-blur-md`}>
            <Icon size={20} className="mb-1" />
            <span className="text-[10px] font-mono tracking-widest uppercase opacity-60">{title}</span>
            <span className="text-xl font-black italic tracking-tighter text-white">{value}</span>
        </div>
    );
};

const TappableProductCard = ({ product }: { product: ProductRecommendation }) => (
    <div 
        onClick={() => { hapticTap(); window.open(`https://www.google.com/search?q=${encodeURIComponent(product.productName)}`, '_blank'); }}
        className="group relative bg-white/5 border border-white/10 p-5 rounded-3xl transition-all duration-300 active:scale-[0.98] hover:bg-white/10 hover:border-cyan-500/30 overflow-hidden"
    >
        <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 group-hover:text-cyan-400 transition-opacity">
            <ExternalLink size={16} />
        </div>
        <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-linear-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center border border-white/10 shrink-0">
                <ShoppingBag size={24} className="text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-[10px] font-black tracking-widest uppercase rounded-full border border-cyan-500/30">
                        {product.productType}
                    </span>
                </div>
                <h4 className="text-white font-bold text-lg truncate leading-tight mb-1">{product.productName}</h4>
                <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed font-medium">{product.reason}</p>
            </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
             <span className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">Tap to View</span>
             <ShoppingCart size={14} className="text-gray-500" />
        </div>
    </div>
);

const FaceScanResultDrawer: React.FC<FaceScanResultDrawerProps> = ({ scan, onClose, isOpen }) => {
  const [activeTab, setActiveTab] = useState<'analysis' | 'products' | 'routine'>('analysis');
  if (!isOpen) return null;
  const results = scan.results;

  return (
    <div className="fixed inset-0 z-200 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-gray-950 border-t border-white/10 rounded-t-[40px] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-slide-up">
        {/* Handle */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto my-4 shrink-0" />
        
        {/* Header */}
        <div className="px-8 pb-4 flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_10px_cyan]"></span>
              <span className="text-[10px] font-mono text-cyan-400 tracking-[0.3em] uppercase">Scan Computed</span>
            </div>
            <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
                {results.summaryTitle}
            </h2>
          </div>
          <button onClick={onClose} className="bg-white/5 p-3 rounded-2xl border border-white/10 text-white/60 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 gap-2 mb-6 shrink-0">
            {[
                { id: 'analysis', label: 'Analysis', icon: LayoutGrid },
                { id: 'products', label: 'Products', icon: ShoppingBag },
                { id: 'routine', label: 'Protocol', icon: ClipboardList }
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => { hapticTap(); setActiveTab(tab.id as any); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-[10px] tracking-widest uppercase transition-all ${activeTab === tab.id ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'bg-white/5 text-gray-400 border border-white/10'}`}
                >
                    <tab.icon size={14} />
                    {tab.label}
                </button>
            ))}
        </div>

        {/* Content */}
        <div className="px-6 pb-12 overflow-y-auto custom-scrollbar flex-1">
          <div className="space-y-8">
            {activeTab === 'analysis' && (
              <div className="space-y-8 animate-fade-in">
                {/* Score Section */}
                <div className="relative group">
                    <div className="absolute -inset-1 bg-linear-to-r from-cyan-500 to-blue-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                    <div className="relative bg-black/40 border border-white/10 rounded-3xl p-8 flex items-center justify-between">
                        <div>
                            <p className="text-4xl font-black text-white italic tracking-tighter mb-1">{results.skinRating}<span className="text-xl opacity-40 ml-1">/10</span></p>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Health Index</p>
                        </div>
                        <div className="text-right">
                           <p className="text-cyan-400 font-black text-lg italic uppercase">{results.skinCondition}</p>
                           <p className="text-gray-500 text-[10px] font-mono tracking-widest uppercase">Status</p>
                        </div>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-3">
                   <MetricCard title="Hydration" value={results.skinAnalysis.hydration} icon={Droplets} color="cyan" />
                   <MetricCard title="Clarity" value={results.skinAnalysis.clarity} icon={Sparkles} color="blue" />
                   <MetricCard title="Radiance" value={results.skinAnalysis.radiance} icon={ActivityIcon} color="emerald" />
                </div>

                {/* Summary Box */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-px bg-white/10 flex-1"></div>
                    <span className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">Diagnostics Summary</span>
                    <div className="h-px bg-white/10 flex-1"></div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 leading-relaxed">
                     <p className="text-gray-300 text-sm font-medium leading-relaxed italic">
                        "{results.comparisonSummary || "Analysis complete. Dermal patterns integrated and verified against historical metadata."}"
                     </p>
                  </div>
                </div>

                {/* Concerns Tags */}
                <div className="flex flex-wrap gap-2">
                    {results.visibleConcerns.map((concern, idx) => (
                        <span key={idx} className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-black tracking-widest uppercase rounded-xl">
                           • {concern}
                        </span>
                    ))}
                </div>
              </div>
            )}

            {activeTab === 'products' && (
              <div className="space-y-4 animate-fade-in">
                {results.recommendations.map((product, idx) => (
                  <TappableProductCard key={idx} product={product} />
                ))}
              </div>
            )}

            {activeTab === 'routine' && (
              <div className="space-y-10 animate-fade-in">
                {results.dailyPlan ? (
                  <>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-white/10 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-400 border border-orange-500/30">
                                <Sun size={20} />
                            </div>
                            <h3 className="font-black text-white text-xl">Morning Protocol</h3>
                        </div>
                        <span className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">AM PHASE</span>
                      </div>
                      <div className="space-y-4">
                        {results.dailyPlan.morning.map((item: any, idx: number) => (
                          <div key={idx} className="flex gap-4 items-start bg-white/5 border border-white/10 p-5 rounded-2xl">
                            <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                              {idx + 1}
                            </div>
                            <div>
                                <p className="text-white font-bold text-base">{item.step}</p>
                                <p className="text-gray-400 text-xs mt-1.5 leading-relaxed font-medium">{item.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-white/10 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/30">
                                <Moon size={20} />
                            </div>
                            <h3 className="font-black text-white text-xl">Evening Protocol</h3>
                        </div>
                        <span className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">PM PHASE</span>
                      </div>
                      <div className="space-y-4">
                        {results.dailyPlan.evening.map((item: any, idx: number) => (
                          <div key={idx} className="flex gap-4 items-start bg-white/5 border border-white/10 p-5 rounded-2xl">
                            <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="text-white font-bold text-base">{item.step}</p>
                              <p className="text-gray-400 text-xs mt-1.5 leading-relaxed font-medium">{item.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 bg-white/5 rounded-3xl border border-dashed border-white/10">
                    <p className="text-gray-500 font-mono text-xs tracking-widest leading-relaxed">NO PROTOCOL DETECTED<br/>PLEASE RE-INITIALIZE SCAN</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceScanResultDrawer;
