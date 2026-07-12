import { BookOpen, BookText, FileText, Trophy, ChevronRight, Lock } from 'lucide-react';

const SECTIONS = [
  {
    id: 'vocabulary',
    title: '单词闯关',
    subtitle: 'PETS-3 核心词汇',
    icon: BookOpen,
    color: '#58cc02',
    bg: 'bg-green-50',
    border: 'border-green-400',
    text: 'text-green-600',
    totalLevels: 10,
  },
  {
    id: 'grammar',
    title: '语法闯关',
    subtitle: '重点语法精讲',
    icon: BookText,
    color: '#1cb0f6',
    bg: 'bg-blue-50',
    border: 'border-blue-400',
    text: 'text-blue-600',
    totalLevels: 8,
  },
  {
    id: 'reading',
    title: '阅读闯关',
    subtitle: '阅读理解训练',
    icon: FileText,
    color: '#ff9600',
    bg: 'bg-orange-50',
    border: 'border-orange-400',
    text: 'text-orange-600',
    totalLevels: 6,
  },
  {
    id: 'exam',
    title: '真题闯关',
    subtitle: 'PETS-3 模拟真题',
    icon: Trophy,
    color: '#ce82ff',
    bg: 'bg-purple-50',
    border: 'border-purple-400',
    text: 'text-purple-600',
    totalLevels: 5,
  },
];

export default function Home({ gameState, onSelectSection }) {
  const { completedLevels, xp } = gameState;

  return (
    <div className="pt-20 pb-24 max-w-md mx-auto px-4">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-green-400 via-green-500 to-green-600 rounded-3xl p-6 mb-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold mb-1">英语闯关 · 备考 PETS-3</h1>
        <p className="text-green-50 text-sm">考试日期：2026年9月20日 · 每天1小时</p>
        <div className="flex items-center gap-3 mt-3">
          <div className="bg-white/20 rounded-lg px-3 py-1.5">
            <span className="text-xs">已完成 {Object.keys(completedLevels).length} 关</span>
          </div>
          <div className="bg-white/20 rounded-lg px-3 py-1.5">
            <span className="text-xs">累计 XP: {xp}</span>
          </div>
        </div>
      </div>

      {/* Section Cards */}
      <div className="space-y-3">
        {SECTIONS.map((section, idx) => {
          const completed = Object.keys(completedLevels)
            .filter(k => k.startsWith(`${section.id}-`)).length;
          const progress = completed / section.totalLevels;
          const Icon = section.icon;

          return (
            <button
              key={section.id}
              className={`w-full ${section.bg} border-2 ${section.border} rounded-2xl p-4 flex items-center gap-4 text-left card-hover`}
              onClick={() => onSelectSection(section)}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
                style={{ backgroundColor: section.color }}
              >
                <Icon className="w-7 h-7 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className={`font-bold text-base ${section.text}`}>{section.title}</h3>
                <p className="text-gray-500 text-xs">{section.subtitle}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${progress * 100}%`, backgroundColor: section.color }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 font-medium">{completed}/{section.totalLevels}</span>
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Exam Info */}
      <div className="mt-6 bg-gray-50 rounded-2xl p-4 text-center">
        <p className="text-xs text-gray-400">PETS-3 笔试 · 满分100分 · 60分合格</p>
        <p className="text-xs text-gray-400 mt-1">听力30% · 语法15% · 阅读30% · 写作25%</p>
      </div>
    </div>
  );
}
