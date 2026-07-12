import { Star, Lock, CheckCircle, ArrowLeft } from 'lucide-react';

export default function PathMap({ section, levels, gameState, onSelectLevel, onBack }) {
  const { completedLevels, getLevelStars, isLevelUnlocked } = gameState;

  const sectionConfig = {
    vocabulary: { color: '#58cc02', title: '单词闯关', icon: '🌱' },
    grammar: { color: '#1cb0f6', title: '语法闯关', icon: '📖' },
    reading: { color: '#ff9600', title: '阅读闯关', icon: '📚' },
    exam: { color: '#ce82ff', title: '真题闯关', icon: '📝' },
  };

  const config = sectionConfig[section] || sectionConfig.vocabulary;
  const completed = levels.filter(l => completedLevels[`${section}-${l.id}`]?.completed).length;

  // Zigzag: alternate between left, center-left, center-right, right
  const offsets = [0, 1, 2, 1, 0, -1, -2, -1, 0, 1];

  return (
    <div className="pt-20 pb-24 min-h-screen" style={{ background: `linear-gradient(180deg, ${config.color}15 0%, transparent 50%)` }}>
      {/* Section header */}
      <div className="max-w-md mx-auto px-4 mb-6">
        <button onClick={onBack} className="flex items-center gap-1 text-gray-500 text-sm mb-4 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </button>
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-md"
            style={{ backgroundColor: config.color }}
          >
            {config.icon}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{config.title}</h2>
            <p className="text-sm text-gray-500">
              已完成 {completed} / {levels.length} 关
            </p>
          </div>
        </div>
      </div>

      {/* Zigzag level path */}
      <div className="max-w-md mx-auto px-4 relative">
        {levels.map((level, idx) => {
          const stars = getLevelStars(section, level.id);
          const isCompleted = completedLevels[`${section}-${level.id}`]?.completed;
          const unlocked = isLevelUnlocked(section, level.id);
          const isCurrent = unlocked && !isCompleted;

          // Zigzag offset: -2 to 2, mapping to left/right positioning
          const offset = offsets[idx % offsets.length];
          const marginLeft = `${50 + offset * 20 - 32}px`; // 32px = half of node width

          return (
            <div key={level.id} className="relative" style={{ marginBottom: '8px' }}>
              {/* Connecting dotted line */}
              {idx < levels.length - 1 && (
                <div
                  className="absolute left-1/2 top-16 w-1 h-12 -translate-x-1/2"
                  style={{
                    backgroundColor: `${config.color}30`,
                    borderRadius: '2px',
                  }}
                />
              )}

              {/* Level node */}
              <div className="flex justify-center relative" style={{ marginLeft, width: '64px', marginBottom: '32px' }}>
                <button
                  onClick={() => unlocked && onSelectLevel(level)}
                  className="relative"
                  disabled={!unlocked}
                >
                  {/* Pulse ring for current level */}
                  {isCurrent && (
                    <div
                      className="absolute inset-0 rounded-full animate-ping"
                      style={{ backgroundColor: `${config.color}40`, animationDuration: '2s' }}
                    />
                  )}

                  {/* Node circle */}
                  <div
                    className="relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all"
                    style={{
                      backgroundColor: isCompleted ? config.color : unlocked ? '#fff' : '#e5e5e5',
                      border: unlocked ? `3px solid ${config.color}` : '3px solid #ccc',
                      cursor: unlocked ? 'pointer' : 'default',
                    }}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-8 h-8 text-white" />
                    ) : unlocked ? (
                      <span className="text-2xl">{level.icon || '⭐'}</span>
                    ) : (
                      <Lock className="w-6 h-6 text-gray-400" />
                    )}

                    {/* Level number badge */}
                    <span
                      className="absolute -top-1 -left-1 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shadow-sm"
                      style={{
                        backgroundColor: isCompleted ? '#fff' : config.color,
                        color: isCompleted ? config.color : '#fff',
                      }}
                    >
                      {level.id}
                    </span>
                  </div>

                  {/* Stars and title below node */}
                  <div className="mt-2 text-center" style={{ width: '120px', marginLeft: '-28px' }}>
                    <p className={`text-xs font-medium leading-tight ${unlocked ? 'text-gray-700' : 'text-gray-400'}`}>
                      {level.title}
                    </p>
                    {isCompleted && (
                      <div className="flex justify-center gap-0.5 mt-1">
                        {[1, 2, 3].map(s => (
                          <Star
                            key={s}
                            className="w-3 h-3"
                            fill={s <= stars ? '#ffc800' : '#e5e5e5'}
                            color={s <= stars ? '#ffc800' : '#e5e5e5'}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom spacer */}
      <div className="h-20" />
    </div>
  );
}
