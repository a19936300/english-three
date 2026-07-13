import { Heart, Flame, Gem, Zap, Sun, Moon, Eye, X } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../theme/index.js';
import DuolingoButton from './ui/DuolingoButton.jsx';

const THEME_ICONS = {
  light: Sun,
  dark: Moon,
  'high-contrast': Eye,
};
const THEME_LABELS = { light: '浅色', dark: '深色', 'high-contrast': '高对比' };

export default function Header({ gameState, onReset }) {
  const [showShop, setShowShop] = useState(false);
  const { theme, cycleTheme } = useTheme();
  const { hearts, maxHearts, gems, streak, dailyXp, dailyGoal } = gameState;

  const ThemeIcon = THEME_ICONS[theme] || Sun;

  return (
    <>
      <header className="status-bar">
        <div className="status-bar__left">
          <button
            className="status-item status-item--hearts"
            onClick={() => setShowShop(true)}
            aria-label={`体力 ${hearts} / ${maxHearts}`}
          >
            <Heart fill="currentColor" />
            <span>
              {hearts}/{maxHearts}
            </span>
          </button>
          <div className="status-item status-item--streak" aria-label={`连续打卡 ${streak} 天`}>
            <Flame fill={streak > 0 ? 'currentColor' : 'none'} />
            <span>{streak}</span>
          </div>
        </div>

        <div className="status-bar__right">
          <div className="status-item status-item--xp" aria-label={`今日经验 ${dailyXp} / ${dailyGoal}`}>
            <Zap fill="currentColor" />
            <span>
              {dailyXp || 0}/{dailyGoal}
            </span>
          </div>
          <button
            className="status-item status-item--gems"
            onClick={() => setShowShop(true)}
            aria-label={`宝石 ${gems}`}
          >
            <Gem fill="currentColor" />
            <span>{gems}</span>
          </button>
          <button
            className="theme-toggle"
            onClick={cycleTheme}
            aria-label={`切换主题，当前${THEME_LABELS[theme]}`}
            title={`主题：${THEME_LABELS[theme]}`}
          >
            <ThemeIcon />
          </button>
        </div>
      </header>

      {showShop && (
        <div className="shop-overlay" onClick={() => setShowShop(false)}>
          <div className="shop-modal" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowShop(false)}
              aria-label="关闭"
              style={{
                position: 'absolute',
                right: 16,
                top: 16,
                background: 'none',
                border: 'none',
                color: 'var(--color-text-secondary)',
              }}
            >
              <X width={20} height={20} />
            </button>
            <h2 className="shop-modal__title">商店</h2>

            {hearts < maxHearts ? (
              <div className="shop-modal__item">
                <div className="shop-modal__item-info">
                  <Heart className="shop-modal__item-icon" fill="currentColor" />
                  <div>
                    <p style={{ fontWeight: 700, color: 'var(--color-text)' }}>恢复全部体力</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      {hearts}/{maxHearts} → {maxHearts}/{maxHearts}
                    </p>
                  </div>
                </div>
                <DuolingoButton
                  variant="info"
                  size="small"
                  disabled={gems < 30}
                  onClick={() => {
                    gameState.refillHearts();
                    setShowShop(false);
                  }}
                >
                  💎 30
                </DuolingoButton>
              </div>
            ) : (
              <p
                style={{
                  textAlign: 'center',
                  color: 'var(--color-text-secondary)',
                  padding: '32px 0',
                  fontSize: '0.875rem',
                }}
              >
                体力已满！去学习吧
              </p>
            )}

            <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 12, paddingTop: 12 }}>
              <button
                onClick={() => {
                  onReset?.();
                  setShowShop(false);
                }}
                style={{
                  width: '100%',
                  color: 'var(--color-danger)',
                  fontSize: '0.8125rem',
                  padding: '8px 0',
                  background: 'none',
                  border: 'none',
                }}
              >
                重置所有进度
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
