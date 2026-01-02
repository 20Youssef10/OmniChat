import React from 'react';
import { Construction, Clock } from 'lucide-react';

interface Props {
  message?: string;
  eta?: string;
}

export const MaintenanceScreen: React.FC<Props> = ({ message, eta }) => {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#0f172a] flex flex-col items-center justify-center p-4 text-center">
      <div className="w-24 h-24 bg-yellow-500/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
        <Construction size={48} className="text-yellow-500" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-4">Under Maintenance</h1>
      <p className="text-slate-400 max-w-md text-lg mb-8">
        {message || "We are currently upgrading our systems to make OmniChat even better. Please check back soon."}
      </p>
      {eta && (
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg text-slate-300">
          <Clock size={20} />
          <span>Estimated return: <span className="text-white font-medium">{eta}</span></span>
        </div>
      )}
    </div>
  );
};