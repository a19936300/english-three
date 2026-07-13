import { BookOpen, BookText, FileText, Trophy } from 'lucide-react';
import OwlMascot from './ui/OwlMascot.jsx';

const SECTIONS = [
  {
    id: 'vocabulary',
    title: '单词',
    subtitle: 'Vocabulary',
    icon: BookOpen,
    iconClass: 'vocab',
    totalLevels: 10,
  },
  {
    id: 'grammar',
    title: '语法',
    subtitle: 'Grammar',
    icon: BookText,
    iconClass: 'grammar',
    totalLevels: 8,
  },
  {
    id: 'reading',
    title: '阅读',
    subtitle: 'Reading',
    icon: FileText,
    iconClass: 'reading',
    totalLevels: 6,
  },
  {
    id: 'exam',
    title: '真题',
    subtitle: 'Exam',
    icon: Trophy,
    iconClass: 'exam',
    totalLevels: 5,
  },
];

export default function Home({ gameState, onSelectSection }) {
  const { completedLevels, xp, streak, dailyXp, dailyGoal } = gameState;
  const completedCount = Object.keys(completedLevels).length;
  const dailyPct = Math.min((dailyXp / dailyGoal) * 100, 100);

  return (
    <div className="home animate-fade-in">
      <div className="home__greeting">
        <OwlMascot size={80} className="home__mascot" />
        <div className="home__greeting-text">
          <h2>英语闯关 · PETS-3</h2>
          <p>已通过 {completedCount} 关 · 累计 {xp} XP</p>
        </div>
      </div>

      <div className="home__daily-goal">
        <svg className="progress-ring" viewBox="0 0 56 56">
          <circle
            cx="28"
            cy="28"
            r="24"
            fill="none"
            stroke="var(--swan)"
            strokeWidth="6"
          />
          <circle
            className="progress-ring__circle"
            cx="28"
            cy="28"
            r="24"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 24}`}
            strokeDashoffset={`${2 * Math.PI * 24 * (1 - dailyPct / 100)}`}
            transform="rotate(-90 28 28)"
          />
        </svg>
        <div className="home__goal-info">
          <h3>每日目标</h3>
          <p>
            今日 {dailyXp} / {dailyGoal} XP{streak > 0 ? ` · 连续 ${streak} 天` : ''}
          </p>
        </div>
      </div>

      <h3 className="home__skills-title">选择技能</h3>
      <div className="home__skills">
        {SECTIONS.map((section) => {
          const completed = Object.keys(completedLevels).filter((k) =>
            k.startsWith(`${section.id}-`),
          ).length;
          const progress = (completed / section.totalLevels) * 100;
          const Icon = section.icon;

          return (
            <button
              key={section.id}
              className="skill-card"
              onClick={() => onSelectSection(section)}
              aria-label={`${section.title} ${section.subtitle}，进度 ${Math.round(progress)}%`}
            >
              <div className={`skill-card__icon skill-card__icon--${section.iconClass}`}>
                <Icon />
              </div>
              <span className="skill-card__label">{section.title}</span>
              <span className="skill-card__sublabel">{section.subtitle}</span>
              <div className="skill-card__progress">
                <div
                  className={`skill-card__progress-fill skill-card__progress-fill--${section.iconClass}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      <div className="home__achievements">
        <h3>考试信息</h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          PETS-3 笔试 · 满分 100 分 · 60 分合格
          <br />
          听力 30% · 语法 15% · 阅读 30% · 写作 25%
        </p>
      </div>
    </div>
  );
}
