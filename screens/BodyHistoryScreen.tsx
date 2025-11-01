import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getBodyScans } from '../services/supabaseService';
import { BodyScan } from '../types';
import { ArrowLeft, Calendar, Activity, Percent } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { hapticTap } from '../utils/haptics';

const BodyHistoryScreen: React.FC = () => {
  const [scans, setScans] = useState<BodyScan[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchScans = async () => {
      if (user) {
        try {
          const userScans = await getBodyScans(user.id);
          setScans(userScans);
        } catch (error) {
          console.error("Failed to fetch body scans:", error);
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

  const ScanCard: React.FC<{ scan: BodyScan }> = ({ scan }) => (
    <div className="bg-white rounded-xl shadow-md overflow-hidden flex items-center p-4 space-x-4">
      <img src={scan.image_url} alt="Body scan" className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
      <div className="flex-grow">
        <h3 className="font-bold text-lg text-gray-800 capitalize">{scan.results.postureAnalysis} Posture</h3>
        <div className="flex items-center text-sm text-gray-500 mt-1">
          <Percent size={14} className="mr-1 text-blue-500" />
          <span>{scan.results.bodyFatPercentage.toFixed(1)}% Body Fat (Est.)</span>
        </div>
        <div className="flex items-center text-xs text-gray-400 mt-2">
          <Calendar size={12} className="mr-1" />
          <span>{formatDate(scan.created_at)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-gray-200 p-4 flex items-center z-10">
        <button onClick={() => { hapticTap(); navigate(-1); }} className="mr-4 p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft size={24} className="text-gray-800" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Body Scan History</h1>
      </header>

      <main className="p-4 space-y-4 pb-24">
        {loading ? (
          <div className="text-center text-gray-500 mt-10">Loading history...</div>
        ) : scans.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">
            <p className="text-lg">No scans yet!</p>
            <p>Your body analysis will appear here.</p>
          </div>
        ) : (
          scans.map(scan => <ScanCard key={scan.id} scan={scan} />)
        )}
      </main>
    </div>
  );
};

export default BodyHistoryScreen;