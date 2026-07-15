import { Star, Lock, Check, ArrowLeft } from 'lucide-react';

const SECTION_CONFIG = {
  vocabulary: { title: '单词闯关', subtitle: 'Vocabulary', color: 'var(--skill-vocab)' },
  grammar: { title: '语法闯关', subtitle: 'Grammar', color: 'var(--skill-grammar)' },
  reading: { title: '阅读闯关', subtitle: 'Reading', color: 'var(--skill-reading)' },
  listening: { title: '听力闯关', subtitle: 'Listening', color: 'var(--skill-listening)' },
  writing: { title: '写作闯关', subtitle: 'Writing', color: 'var(--skill-writing)' },
  speaking: { title: '口试闯关', subtitle: 'Speaking', color: 'var(--skill-speaking)' },
};

export default function PathMap({ section, levels, gameState, onSelectLevel, onBack }) {
  const { completedLevels, getLevelStars, isLevelUnlocked } = gameState;
  const config = SECTION_CONFIG[section] || SECTION_CONFIG.vocabulary;
  const completed = levels.filter(
    (l) => completedLevels[`${section}-${l.id}`]?.completed,
  ).length;
  const overallPct = levels.length ? (completed / levels.length) * 100 : 0;

  return (
    <div className="map-view animate-fade-in">
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          color: 'var(--color-text-secondary)',
          fontSize: '0.875rem',
          marginBottom: 16,
          background: 'none',
          border: 'none',
        }}
      >
        <ArrowLeft width={16} height={16} />
        返回首页
      </button>

      <div className="map__unit-header" style={{ background: `linear-gradient(135deg, ${config.color} 0%, var(--duo-green-light) 100%)` }}>
        <h2>{config.title}</h2>
        <p>
          {config.subtitle} · 已完成 {completed} / {levels.length} 关
        </p>
        <div className="map__progress-bar">
          <div className="map__progress-fill" style={{ width: `${overallPct}%` }} />
        </div>
      </div>

      <div className="map__path">
        {levels.map((level) => {
          const stars = getLevelStars(section, level.id);
          const isCompleted = !!completedLevels[`${section}-${level.id}`]?.completed;
          const unlocked = isLevelUnlocked(section, level.id);
          const isCurrent = unlocked && !isCompleted;

          const stateClass = isCompleted
            ? 'map__node--completed'
            : isCurrent
              ? 'map__node--current'
              : 'map__node--locked';

          return (
            <button
              key={level.id}
              className={`map__node ${stateClass}`}
              onClick={() => unlocked && onSelectLevel(level)}
              disabled={!unlocked}
              aria-label={`第${level.id}课：${level.title}，${isCompleted ? '已完成' : isCurrent ? '当前课程' : '未解锁'}`}
            >
              {isCompleted ? (
                <Check />
              ) : unlocked ? (
                <span style={{ fontSize: 24 }}>{level.icon || '⭐'}</span>
              ) : (
                <Lock />
              )}

              <span className="map__node-badge">{level.id}</span>

              <span className="map__node-label">{level.title}</span>

              {isCompleted && stars > 0 && (
                <span className="map__node-stars">
                  {[1, 2, 3].map((s) => (
                    <Star
                      key={s}
                      fill={s <= stars ? 'var(--duo-yellow)' : 'var(--swan)'}
                      color={s <= stars ? 'var(--duo-yellow)' : 'var(--swan)'}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ height: 48 }} />
    </div>
  );
}
