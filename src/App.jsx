import { useState, useCallback, useEffect } from 'react';
import { useGameState } from './hooks/useGameState';
import { useLevelData } from './hooks/useLevelData';
import Header from './components/Header';
import Home from './components/Home';
import PathMap from './components/PathMap';
import VocabLesson from './components/VocabLesson';
import QuizLesson from './components/QuizLesson';
import ResultScreen from './components/ResultScreen';
import TutorChat from './components/TutorChat';
import { TutorProvider, useTutor } from './context/TutorContext';
import { buildPresenceScene } from './lib/tutorScene';

function AppPresenceSync({ view, section, currentLevel, result }) {
  const { setPresence } = useTutor();
  useEffect(() => {
    if (view === 'home') {
      setPresence(buildPresenceScene({ surface: 'home' }));
    } else if (view === 'path') {
      setPresence(buildPresenceScene({ surface: 'path', section }));
    } else if (view === 'lesson' && currentLevel) {
      setPresence(
        buildPresenceScene({
          surface: 'lesson',
          section,
          levelId: currentLevel.id,
          levelTitle: currentLevel.title,
        }),
      );
    } else if (view === 'result' && result) {
      setPresence(
        buildPresenceScene({
          surface: 'result',
          section,
          levelId: currentLevel?.id,
          levelTitle: currentLevel?.title,
          content: {
            type: 'result',
            correct: result.correctCount,
            total: result.total,
            wrong: result.wrongCount,
          },
        }),
      );
    }
  }, [view, section, currentLevel, result, setPresence]);
  return null;
}

const ENABLE_TUTOR = false; // 问老师功能开关，改为 true 恢复

function AppShell() {
  const gameState = useGameState();
  const { levelsBySection, loading, error } = useLevelData();
  const { open: tutorOpen } = useTutor();
  const [view, setView] = useState('home');
  const [section, setSection] = useState(null);
  const [currentLevel, setCurrentLevel] = useState(null);
  const [result, setResult] = useState(null);

  const handleSelectSection = useCallback((sec) => {
    setSection(sec.id);
    setView('path');
  }, []);

  const handleSelectLevel = useCallback((level) => {
    setCurrentLevel(level);
    setView('lesson');
  }, []);

  const handleLessonComplete = useCallback((stars, score, total, wrongCount) => {
    const xpGained = Math.round((score / total) * 20) + (stars === 3 ? 10 : 0);
    setResult({ stars, correctCount: score, total, wrongCount, xpGained });
    setView('result');
  }, []);

  const handleContinue = useCallback(() => {
    if (!section || !currentLevel) {
      setView('home');
      return;
    }
    const levels = levelsBySection[section] || [];
    const nextLevel = levels.find((l) => l.id === currentLevel.id + 1);
    if (nextLevel) {
      setCurrentLevel(nextLevel);
      setResult(null);
      setView('lesson');
    } else {
      setView('path');
    }
  }, [section, currentLevel, levelsBySection]);

  const handleRetry = useCallback(() => {
    setResult(null);
    setView('lesson');
  }, []);

  const handleHome = useCallback(() => {
    setResult(null);
    setCurrentLevel(null);
    setView('home');
  }, []);

  const handleBackToHome = useCallback(() => {
    setSection(null);
    setView('home');
  }, []);

  const handleBackToPath = useCallback(() => {
    setCurrentLevel(null);
    setView('path');
  }, []);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        加载中...
      </div>
    );
  }
  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ color: 'var(--color-danger)' }}
      >
        加载失败：{error.message}
      </div>
    );
  }
  if (!levelsBySection) return null;

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'var(--color-bg)',
        // 抽屉打开时，给底层 fixed 全屏的 lesson-shell 留出底部空间，
        // 让 footer（翻页/开始测试按钮）可见可点击；其他视图同理。
        '--tutor-drawer-height': tutorOpen ? '45vh' : '0px',
      }}
    >
      <AppPresenceSync
        view={view}
        section={section}
        currentLevel={currentLevel}
        result={result}
      />
      {view !== 'lesson' && view !== 'result' && (
        <Header gameState={gameState} onReset={handleHome} />
      )}

      {view === 'home' && (
        <Home gameState={gameState} onSelectSection={handleSelectSection} />
      )}

      {view === 'path' && section && (
        <PathMap
          section={section}
          levels={levelsBySection[section] || []}
          gameState={gameState}
          onSelectLevel={handleSelectLevel}
          onBack={handleBackToHome}
        />
      )}

      {view === 'lesson' && section && currentLevel && (
        section === 'vocabulary' ? (
          <VocabLesson
            level={currentLevel}
            gameState={gameState}
            maxLevels={(levelsBySection.vocabulary || []).length}
            onComplete={handleLessonComplete}
            onExit={handleBackToPath}
          />
        ) : (
          <QuizLesson
            level={currentLevel}
            section={section}
            gameState={gameState}
            maxLevels={(levelsBySection[section] || []).length}
            onComplete={handleLessonComplete}
            onExit={handleBackToPath}
          />
        )
      )}

      {view === 'result' && result && (
        <ResultScreen
          stars={result.stars}
          correctCount={result.correctCount}
          total={result.total}
          wrongCount={result.wrongCount}
          xpGained={result.xpGained}
          onContinue={handleContinue}
          onRetry={handleRetry}
          onHome={handleHome}
        />
      )}

      {ENABLE_TUTOR && <TutorChat />}
    </div>
  );
}

export default function App() {
  return (
    <TutorProvider>
      <AppShell />
    </TutorProvider>
  );
}
