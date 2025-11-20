import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getNutritionScans } from '../services/firebaseService';
import { NutritionScan } from '../types';
import { ArrowLeft, Calendar, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { hapticTap } from '../utils/haptics';

const FoodHistoryScreen: React.FC = () => {
  const [scans, setScans] = useState<NutritionScan[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchScans = async () => {
      if (user) {
        try {
          const userScans = await getNutritionScans(user.uid);
          setScans(userScans);
        } catch (error) {
          console.error("Failed to fetch food scans:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchScans();
  }, [user]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Just now';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleScanClick = (scan: NutritionScan) => {
    hapticTap();
    navigate('/history/food/detail', { state: { scan } });
  };

  const ScanCard: React.FC<{ scan: NutritionScan }> = ({ scan }) => (
    <button
      onClick={() => handleScanClick(scan)}
      className="w-full bg-white rounded-xl shadow-md overflow-hidden flex items-center p-4 space-x-4 text-left transition-transform duration-200 hover:scale-[1.02]"
    >
      <img src={scan.image_url} alt={scan.results.foodName} className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
      <div className="flex-grow">
        <h3 className="font-bold text-lg text-gray-800 capitalize">{scan.results.foodName}</h3>
        <div className="flex items-center text-sm text-gray-500 mt-1">
          <Flame size={14} className="mr-1 text-orange-500" />
          <span>{scan.results.calories.toFixed(0)} kcal</span>
        </div>
        <div className="flex items-center text-xs text-gray-400 mt-2">
          <Calendar size={12} className="mr-1" />
          <span>{formatDate(scan.created_at)}</span>
        </div>
      </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-gray-200 p-4 flex items-center z-10">
        <button onClick={() => { hapticTap(); navigate('/scanner/food'); }} className="mr-4 p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft size={24} className="text-gray-800" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Food Scan History</h1>
      </header>

      <main className="p-4 space-y-4 pb-24">
        {loading ? (
          <div className="text-center text-gray-500 mt-10">Loading history...</div>
        ) : scans.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">
            <p className="text-lg">No scans yet!</p>
            <p>Your scanned meals will appear here.</p>
          </div>
        ) : (
          scans.map(scan => <ScanCard key={scan.id} scan={scan} />)
        )}
      </main>
    </div>
  );
};

export default FoodHistoryScreen;
