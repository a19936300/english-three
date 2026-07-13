import { useState, useEffect } from 'react';
import { Star, Home, RotateCw, ChevronRight, Target, Check, X, Zap } from 'lucide-react';
import DuolingoButton from './ui/DuolingoButton';
import Confetti from './ui/Confetti';
import OwlMascot from './ui/OwlMascot';

export default function ResultScreen({ stars, correctCount, total, wrongCount, xpGained, onContinue, onRetry, onHome }) {
  const [showStars, setShowStars] = useState(0);

  useEffect(() => {
    const timers = [];
    for (let i = 1; i <= stars; i++) {
      timers.push(setTimeout(() => setShowStars(i), i * 350));
    }
    return () => timers.forEach(clearTimeout);
  }, [stars]);

  const accuracy = Math.round((correctCount / total) * 100);
  const messages = { 3: '完美通关！', 2: '做得不错！', 1: '继续努力！' };
  const subtitles = {
    3: '所有题目都答对了，太厉害了！',
    2: '差一点点就满分了，加油！',
    1: '多练习几次就能掌握得更好',
  };

  const accuracyColorClass =
    accuracy >= 80 ? 'results__stat-value--green' : accuracy >= 60 ? 'results__stat-value--orange' : 'results__stat-value--blue';

  return (
    <div className="results-view" style={{ paddingTop: 24, paddingBottom: 24 }}>
      <Confetti active={stars >= 2} count={stars === 3 ? 60 : 30} durationMs={4000} />

      <div className="results__celebration">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <OwlMascot size={80} />
        </div>

        <div className="results__stars">
          {[1, 2, 3].map((s) => (
            <Star
              key={s}
              className={`results__star ${showStars >= s ? 'earned' : ''} ${showStars >= s ? 'results__star--gold' : 'results__star--empty'}`}
              fill={showStars >= s ? 'currentColor' : 'none'}
            />
          ))}
        </div>

        <h2 className="results__title">{messages[stars] || '完成关卡！'}</h2>
        <p className="results__subtitle">{subtitles[stars] || '继续前进吧'}</p>
      </div>

      <div className="results__xp">
        <Zap className="results__xp-icon" fill="currentColor" />
        <span className="results__xp-text">+{xpGained} XP</span>
      </div>

      <div className="results__card">
        <div className="results__stat-row">
          <span className="results__stat-label">
            <Target />
            正确率
          </span>
          <span className={`results__stat-value ${accuracyColorClass}`}>{accuracy}%</span>
        </div>
        <div className="results__stat-row">
          <span className="results__stat-label">
            <Check />
            答对
          </span>
          <span className="results__stat-value results__stat-value--green">{correctCount} 题</span>
        </div>
        <div className="results__stat-row">
          <span className="results__stat-label">
            <X />
            答错
          </span>
          <span className="results__stat-value results__stat-value--orange">{wrongCount} 题</span>
        </div>
        <div className="results__stat-row">
          <span className="results__stat-label">
            <Zap />
            获得经验
          </span>
          <span className="results__stat-value results__stat-value--blue">+{xpGained} XP</span>
        </div>
      </div>

      <div className="results__actions">
        <DuolingoButton variant="primary" onClick={onContinue}>
          继续下一关
          <ChevronRight width={16} height={16} />
        </DuolingoButton>
        <div style={{ display: 'flex', gap: 8 }}>
          <DuolingoButton variant="secondary" size="small" onClick={onRetry} style={{ flex: 1 }}>
            <RotateCw width={16} height={16} />
            再来一次
          </DuolingoButton>
          <DuolingoButton variant="secondary" size="small" onClick={onHome} style={{ flex: 1 }}>
            <Home width={16} height={16} />
            返回首页
          </DuolingoButton>
        </div>
      </div>
    </div>
  );
}
