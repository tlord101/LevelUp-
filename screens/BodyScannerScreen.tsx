import React from 'react';
import { Scan } from 'lucide-react';

const BodyScannerScreen: React.FC = () => {
  return (
    <div className="p-6">
      <div className="flex flex-col items-center text-center mt-12">
        <Scan className="w-24 h-24 text-purple-400 mb-6" />
        <h1 className="text-3xl font-bold text-gray-900">Body Scanner</h1>
        <p className="mt-2 text-lg text-gray-600 max-w-md">
            Analyze your posture and track your body stats. This feature is under construction.
        </p>
      </div>
    </div>
  );
};

export default BodyScannerScreen;