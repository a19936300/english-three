import { Heart, Flame, Gem, Zap } from 'lucide-react';
import { useState } from 'react';

export default function Header({ gameState, onReset }) {
  const [showShop, setShowShop] = useState(false);
  const { hearts, maxHearts, xp, gems, streak, userLevel, xpProgress, dailyXp, dailyGoal } = gameState;

  const xpPct = Math.min((dailyXp / dailyGoal) * 100, 100);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-md mx-auto px-3 py-2.5 flex items-center justify-between gap-2">
          {/* Hearts */}
          <div className="flex items-center gap-1 cursor-pointer" onClick={() => setShowShop(true)}>
            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
            <span className="font-bold text-gray-700 text-sm">{hearts}/{maxHearts}</span>
          </div>

          {/* Level / XP bar */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4 text-purple-500 fill-purple-500" />
              <span className="text-xs font-bold text-gray-600">Lv.{userLevel}</span>
            </div>
            <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(xpProgress, 100)}%` }}
              />
            </div>
          </div>

          {/* Daily XP */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-gray-400">{dailyXp || 0}/{dailyGoal}</span>
          </div>

          {/* Streak */}
          <div className="flex items-center gap-1">
            <Flame className={`w-5 h-5 ${streak > 0 ? 'text-orange-500 fill-orange-500' : 'text-gray-300 fill-gray-200'}`} />
            <span className="font-bold text-gray-700 text-sm">{streak}</span>
          </div>

          {/* Gems */}
          <div className="flex items-center gap-1 cursor-pointer" onClick={() => setShowShop(true)}>
            <Gem className="w-5 h-5 text-blue-500 fill-blue-400" />
            <span className="font-bold text-gray-700 text-sm">{gems}</span>
          </div>
        </div>
      </header>

      {/* Shop modal */}
      {showShop && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
          onClick={() => setShowShop(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-center mb-4">商店</h2>

            {hearts < maxHearts ? (
              <div className="bg-red-50 rounded-2xl p-4 mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Heart className="w-8 h-8 text-red-500 fill-red-500" />
                  <div>
                    <p className="font-bold text-gray-800">恢复全部体力</p>
                    <p className="text-xs text-gray-500">{hearts}/{maxHearts} → {maxHearts}/{maxHearts}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    gameState.refillHearts();
                    setShowShop(false);
                  }}
                  disabled={gems < 30}
                  className="btn-3d bg-blue-500 text-white px-4 py-2 rounded-xl font-bold disabled:opacity-40"
                >
                  💎 30
                </button>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">体力已满！去学习吧</p>
            )}

            <div className="border-t pt-3 mt-3">
              <button
                onClick={() => { onReset?.(); setShowShop(false); }}
                className="w-full text-red-500 text-sm py-2"
              >
                重置所有进度
              </button>
            </div>
            <button
              onClick={() => setShowShop(false)}
              className="w-full mt-4 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </>
  );
}
