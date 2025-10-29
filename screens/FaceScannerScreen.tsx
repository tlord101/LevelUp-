import React from 'react';
import { Smile } from 'lucide-react';

const FaceScannerScreen: React.FC = () => {
  return (
    <div className="p-6">
      <div className="flex flex-col items-center text-center mt-12">
        <Smile className="w-24 h-24 text-pink-400 mb-6" />
        <h1 className="text-3xl font-bold text-gray-900">Face Scanner</h1>
        <p className="mt-2 text-lg text-gray-600 max-w-md">
            Analyze your skin health and get personalized beauty tips. This feature is coming soon!
        </p>
      </div>
    </div>
  );
};

export default FaceScannerScreen;