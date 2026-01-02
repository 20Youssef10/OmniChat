import React from 'react';
import { UserProfile } from '../../types';
import { LEVELS } from '../../utils/gamification';
import { Trophy, Star, Zap } from 'lucide-react';

interface Props {
  user: UserProfile;
  compact?: boolean;
}

export const LevelBadge: React.FC<Props> = ({ user, compact = false }) => {
  const { xp, level, streak } = user.gamification;
  const currentLevelInfo = LEVELS.find(l => l.level === level) || LEVELS[0];
  const nextLevelInfo = LEVELS.find(l => l.level === level + 1);
  
  const xpForCurrent = currentLevelInfo.xp;
  const xpForNext = nextLevelInfo ? nextLevelInfo.xp : xp * 1.5;
  const progress = Math.min(100, Math.max(0, ((xp - xpForCurrent) / (xpForNext - xpForCurrent)) * 100));

  if (compact) {
      return (
          <div className="flex items-center gap-2 bg-slate-800/50 rounded-full px-2 py-1 border border-slate-700">
              <div className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-[10px] font-bold">
                  {level}
              </div>
              <div className="h-1.5 w-12 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
              </div>
          </div>
      );
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  {level}
              </div>
              <div>
                  <div className="text-sm font-bold text-white leading-none">{currentLevelInfo.title}</div>
                  <div className="text-[10px] text-slate-400 leading-none mt-0.5">{xp} XP</div>
              </div>
          </div>
          <div className="flex items-center gap-1 bg-orange-500/10 px-2 py-1 rounded text-xs font-medium text-orange-400 border border-orange-500/20">
              <Zap size={12} fill="currentColor" />
              {streak} day streak
          </div>
      </div>
      
      <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-500 uppercase tracking-wider font-medium">
              <span>Progress</span>
              <span>{Math.floor(progress)}%</span>
          </div>
          <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
          </div>
          {nextLevelInfo && (
              <div className="text-[10px] text-slate-500 text-right">
                  {nextLevelInfo.xp - xp} XP to {nextLevelInfo.title}
              </div>
          )}
      </div>
    </div>
  );
};