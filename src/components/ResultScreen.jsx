import { useState, useEffect } from 'react';
import { Star, Home, RotateCw } from 'lucide-react';

export default function ResultScreen({ stars, correctCount, total, wrongCount, xpGained, onContinue, onRetry, onHome }) {
  const [showStars, setShowStars] = useState(0);

  useEffect(() => {
    const timers = [];
    for (let i = 1; i <= stars; i++) {
      timers.push(setTimeout(() => setShowStars(i), i * 300));
    }
    return () => timers.forEach(clearTimeout);
  }, [stars]);

  const accuracy = Math.round((correctCount / total) * 100);
  const messages = { 3: '完美通关！', 2: '做得不错！', 1: '继续努力！' };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-yellow-50 to-white flex flex-col items-center justify-center px-4">
      {/* Title */}
      <h2 className="text-2xl font-bold text-gray-800 mb-8">
        {messages[stars] || '完成关卡！'}
      </h2>

      {/* Stars */}
      <div className="flex gap-4 mb-8">
        {[1, 2, 3].map(s => (
          <div
            key={s}
            className={showStars >= s ? 'animate-bounce-in' : ''}
          >
            <Star
              className={`w-20 h-20 ${showStars >= s ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-gray-200'}`}
            />
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-lg border border-gray-100 mb-6">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
          <span className="text-gray-500 text-sm">正确率</span>
          <span className="font-bold text-2xl" style={{ color: accuracy >= 80 ? '#58cc02' : accuracy >= 60 ? '#ff9600' : '#ff4b4b' }}>
            {accuracy}%
          </span>
        </div>
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-500 text-sm">答对</span>
          <span className="font-bold text-green-600 text-lg">{correctCount} 题</span>
        </div>
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-500 text-sm">答错</span>
          <span className="font-bold text-red-500 text-lg">{wrongCount} 题</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500 text-sm">获得经验</span>
          <span className="font-bold text-purple-500 text-lg">+{xpGained} XP</span>
        </div>
      </div>

      {/* Actions */}
      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={onContinue}
          className="btn-3d w-full bg-green-500 text-white py-4 rounded-2xl font-bold text-lg"
        >
          继续下一关
        </button>
        <div className="flex gap-3">
          <button
            onClick={onRetry}
            className="flex-1 btn-3d bg-gray-100 text-gray-600 py-3 rounded-2xl font-bold flex items-center justify-center gap-1"
          >
            <RotateCw className="w-4 h-4" />
            再来一次
          </button>
          <button
            onClick={onHome}
            className="flex-1 btn-3d bg-gray-100 text-gray-600 py-3 rounded-2xl font-bold flex items-center justify-center gap-1"
          >
            <Home className="w-4 h-4" />
            返回首页
          </button>
        </div>
      </div>
    </div>
  );
}
