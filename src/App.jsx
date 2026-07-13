import { useState, useCallback } from 'react';
import { useGameState } from './hooks/useGameState';
import { useLevelData } from './hooks/useLevelData';
import Header from './components/Header';
import Home from './components/Home';
import PathMap from './components/PathMap';
import VocabLesson from './components/VocabLesson';
import QuizLesson from './components/QuizLesson';
import ResultScreen from './components/ResultScreen';

export default function App() {
  const gameState = useGameState();
  const { levelsBySection, loading, error } = useLevelData();
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
    const nextLevel = levels.find(l => l.id === currentLevel.id + 1);
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
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        加载中...
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        加载失败：{error.message}
      </div>
    );
  }
  if (!levelsBySection) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - hidden during lesson and result */}
      {view !== 'lesson' && view !== 'result' && (
        <Header gameState={gameState} onReset={handleHome} />
      )}

      {/* Simple conditional rendering - no AnimatePresence to avoid blank page issues */}
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
    </div>
  );
}
