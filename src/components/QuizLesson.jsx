import { useState, useCallback } from 'react';
import { ArrowLeft, Check, X, Heart, Volume2 } from 'lucide-react';
import ProgressBar from './ProgressBar';

export default function QuizLesson({ level, section, gameState, maxLevels, onComplete, onExit }) {
  const hasLesson = !!level.lesson;
  const hasPassage = !!level.passage;
  const questions = level.quiz || level.questions || [];

  const [phase, setPhase] = useState(hasLesson ? 'lesson' : hasPassage ? 'passage' : 'quiz');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [wrongCount, setWrongCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [hearts, setHearts] = useState(gameState.hearts);

  const sectionColors = {
    vocabulary: '#58cc02',
    grammar: '#1cb0f6',
    reading: '#ff9600',
    exam: '#ce82ff',
  };
  const color = sectionColors[section] || '#1cb0f6';

  const speak = useCallback((text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.8;
      window.speechSynthesis.speak(u);
    }
  }, []);

  const handleAnswer = (idx) => {
    if (feedback) return;
    setSelectedAnswer(idx);
    const q = questions[currentIdx];
    const correct = idx === q.answer;
    setFeedback(correct ? 'correct' : 'wrong');
    if (correct) {
      setCorrectCount(c => c + 1);
    } else {
      setWrongCount(c => c + 1);
      setHearts(h => Math.max(0, h - 1));
      gameState.loseHeart();
    }
  };

  const nextQuestion = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(i => i + 1);
      setSelectedAnswer(null);
      setFeedback(null);
    } else {
      const stars = wrongCount === 0 ? 3 : wrongCount <= 2 ? 2 : 1;
      gameState.completeLevel(section, level.id, correctCount, questions.length, wrongCount, maxLevels);
      onComplete(stars, correctCount, questions.length, wrongCount);
    }
  };

  // Out of hearts
  if (hearts === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center px-4">
        <div className="text-center">
          <Heart className="w-16 h-16 text-red-500 fill-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">体力用完了！</h2>
          <p className="text-gray-500 text-sm mb-6">用宝石恢复体力继续闯关</p>
          <button
            onClick={() => {
              gameState.refillHearts();
              setHearts(gameState.maxHearts);
            }}
            disabled={gameState.gems < 30}
            className="btn-3d bg-blue-500 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-40 mb-3"
          >
            💎 30 恢复体力
          </button>
          <button onClick={onExit} className="block w-full text-gray-500 text-sm mt-2">
            退出关卡
          </button>
        </div>
      </div>
    );
  }

  // Lesson phase (grammar lesson)
  if (phase === 'lesson') {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <button onClick={onExit} className="text-gray-400">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-500">语法讲解</span>
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
            <span className="text-sm font-bold text-gray-600">{hearts}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-md mx-auto">
            <div
              className="rounded-3xl p-6 mb-4 border-2"
              style={{ backgroundColor: `${color}11`, borderColor: `${color}33` }}
            >
              <h2 className="text-xl font-bold mb-3" style={{ color }}>{level.title}</h2>
              <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                {level.lesson}
              </div>
            </div>

            {level.examples && level.examples.length > 0 && (
              <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                <h3 className="font-bold text-gray-700 text-sm mb-3">例句</h3>
                {level.examples.map((ex, idx) => (
                  <div key={idx} className="mb-3 last:mb-0">
                    <p className="text-gray-800 text-sm font-medium flex items-start gap-2">
                      <button onClick={() => speak(ex.en)}>
                        <Volume2 className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      </button>
                      <span>{ex.en}</span>
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5 ml-6">{ex.cn}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => setPhase('quiz')}
            className="btn-3d w-full text-white py-4 rounded-2xl font-bold text-lg"
            style={{ backgroundColor: color }}
          >
            开始练习 ({questions.length}题)
          </button>
        </div>
      </div>
    );
  }

  // Passage phase (reading/exam)
  if (phase === 'passage') {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <button onClick={onExit} className="text-gray-400">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-500">阅读理解</span>
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
            <span className="text-sm font-bold text-gray-600">{hearts}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-md mx-auto">
            <div
              className="rounded-3xl p-6 mb-4 border-2"
              style={{ backgroundColor: `${color}11`, borderColor: `${color}33` }}
            >
              <h2 className="text-lg font-bold mb-3" style={{ color }}>{level.title}</h2>
              <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-line mb-3">
                {level.passage}
              </div>
              {level.passageCn && (
                <div className="border-t border-gray-200 pt-3">
                  <p className="text-xs text-gray-400 mb-1">中文翻译：</p>
                  <p className="text-gray-500 text-xs leading-relaxed whitespace-pre-line">
                    {level.passageCn}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => setPhase('quiz')}
            className="btn-3d w-full text-white py-4 rounded-2xl font-bold text-lg"
            style={{ backgroundColor: color }}
          >
            开始答题 ({questions.length}题)
          </button>
        </div>
      </div>
    );
  }

  // Quiz phase
  const q = questions[currentIdx];
  const progress = (currentIdx + 1) / questions.length;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <button onClick={onExit} className="text-gray-400">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-sm text-gray-500">{currentIdx + 1} / {questions.length}</span>
        <div className="flex items-center gap-1">
          <Heart className="w-4 h-4 text-red-500 fill-red-500" />
          <span className="text-sm font-bold text-gray-600">{hearts}</span>
        </div>
      </div>

      <div className="px-4 py-2">
        <ProgressBar progress={progress} color={color} height={6} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 overflow-y-auto">
        <div key={currentIdx} className="w-full max-w-md">
          {/* Cloze passage reference */}
          {level.type === 'cloze' && q.blank && (
            <div className="bg-gray-50 rounded-2xl p-4 mb-4 text-sm text-gray-600 leading-relaxed max-h-40 overflow-y-auto">
              <p className="text-xs text-gray-400 mb-1">完形填空原文：</p>
              <p className="whitespace-pre-line">{level.passage}</p>
            </div>
          )}

          {/* Question */}
          <div
            className="rounded-2xl p-5 mb-4 border-2"
            style={{ backgroundColor: `${color}08`, borderColor: `${color}22` }}
          >
            <p className="text-gray-800 text-base font-medium leading-relaxed">
              {q.question || `选择填入第${q.blank}空的正确答案`}
            </p>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 gap-2.5">
            {q.options.map((option, idx) => {
              const isSelected = selectedAnswer === idx;
              const isCorrect = idx === q.answer;
              let bgClass = 'bg-white border-gray-200 text-gray-700';

              if (feedback) {
                if (isCorrect) {
                  bgClass = 'bg-green-50 border-green-400 text-green-600';
                } else if (isSelected) {
                  bgClass = 'bg-red-50 border-red-400 text-red-600';
                } else {
                  bgClass = 'bg-white border-gray-200 text-gray-400 opacity-50';
                }
              } else if (isSelected) {
                bgClass = 'bg-blue-50 border-blue-400 text-blue-600';
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={!!feedback}
                  className={`${bgClass} border-2 rounded-2xl py-3.5 px-4 font-medium text-sm text-left flex items-center justify-between transition-all ${!feedback ? 'btn-3d' : ''}`}
                >
                  <span>{option}</span>
                  {feedback && isCorrect && <Check className="w-5 h-5 flex-shrink-0" />}
                  {feedback && isSelected && !isCorrect && <X className="w-5 h-5 flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Feedback */}
          {feedback && (
            <div className={`mt-4 rounded-2xl p-4 ${feedback === 'correct' ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className={`font-bold text-sm mb-1 ${feedback === 'correct' ? 'text-green-600' : 'text-red-600'}`}>
                {feedback === 'correct' ? '✓ 回答正确！' : '✗ 答错了'}
              </p>
              {q.explanation && (
                <p className="text-xs text-gray-600 leading-relaxed">
                  {q.explanation}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom action */}
      <div className="p-4 border-t border-gray-100">
        {feedback ? (
          <button
            onClick={nextQuestion}
            className="btn-3d w-full text-white py-4 rounded-2xl font-bold text-lg"
            style={{ backgroundColor: color }}
          >
            {currentIdx + 1 < questions.length ? '下一题' : '完成'}
          </button>
        ) : (
          <button
            disabled
            className="w-full bg-gray-200 text-gray-400 py-4 rounded-2xl font-bold text-lg"
          >
            选择答案
          </button>
        )}
      </div>
    </div>
  );
}
