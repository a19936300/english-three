import { useState, useCallback } from 'react';
import { ArrowLeft, Volume2, Check, X, Heart } from 'lucide-react';
import ProgressBar from './ProgressBar';

export default function VocabLesson({ level, gameState, onComplete, onExit }) {
  const { words } = level;
  const [phase, setPhase] = useState('learn'); // 'learn' | 'quiz'
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizIdx, setQuizIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [quizWrongCount, setQuizWrongCount] = useState(0);
  const [quizCorrectCount, setQuizCorrectCount] = useState(0);
  const [hearts, setHearts] = useState(gameState.hearts);

  const speak = useCallback((text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.8;
      window.speechSynthesis.speak(u);
    }
  }, []);

  const startQuiz = useCallback(() => {
    const questions = words.map(word => {
      const otherMeanings = words
        .filter(w => w.en !== word.en)
        .map(w => w.cn)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      const options = [...otherMeanings, word.cn].sort(() => Math.random() - 0.5);
      const answerIdx = options.indexOf(word.cn);
      return {
        word: word.en,
        phonetic: word.phonetic,
        correctAnswer: word.cn,
        options,
        answerIdx,
      };
    });
    setQuizQuestions(questions);
    setQuizIdx(0);
    setPhase('quiz');
  }, [words]);

  const handleAnswer = (idx) => {
    if (feedback) return;
    setSelectedAnswer(idx);
    const correct = idx === quizQuestions[quizIdx].answerIdx;
    setFeedback(correct ? 'correct' : 'wrong');
    if (correct) {
      setQuizCorrectCount(c => c + 1);
    } else {
      setQuizWrongCount(c => c + 1);
      setHearts(h => Math.max(0, h - 1));
      gameState.loseHeart();
    }
  };

  const nextQuestion = () => {
    if (quizIdx + 1 < quizQuestions.length) {
      setQuizIdx(i => i + 1);
      setSelectedAnswer(null);
      setFeedback(null);
    } else {
      const stars = quizWrongCount === 0 ? 3 : quizWrongCount <= 2 ? 2 : 1;
      gameState.completeLevel('vocabulary', level.id, quizCorrectCount, quizQuestions.length, quizWrongCount);
      onComplete(stars, quizCorrectCount, quizQuestions.length, quizWrongCount);
    }
  };

  // Out of hearts
  if (hearts === 0 && phase === 'quiz') {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center px-4">
        <div className="text-center">
          <Heart className="w-16 h-16 text-red-500 fill-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">体力用完了！</h2>
          <p className="text-gray-500 text-sm mb-6">用宝石可以恢复体力，继续闯关</p>
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

  // Learning phase - flashcards
  if (phase === 'learn') {
    const word = words[currentIdx];
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <button onClick={onExit} className="text-gray-400">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-500">
            学习卡片 {currentIdx + 1} / {words.length}
          </span>
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
            <span className="text-sm font-bold text-gray-600">{hearts}</span>
          </div>
        </div>

        <div className="px-4 py-2">
          <ProgressBar progress={(currentIdx + 1) / words.length} color="#58cc02" height={6} />
        </div>

        <div className="flex-1 flex items-center justify-center px-4 overflow-y-auto">
          <div className="w-full max-w-md">
            <div className="bg-green-50 rounded-3xl p-8 text-center shadow-lg border-2 border-green-200">
              <button
                onClick={() => speak(word.en)}
                className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center mb-4 mx-auto btn-3d"
              >
                <Volume2 className="w-6 h-6 text-white" />
              </button>

              <h2 className="text-3xl font-bold text-gray-800 mb-2">{word.en}</h2>
              <p className="text-gray-400 text-sm mb-4">{word.phonetic}</p>

              {showAnswer && (
                <div className="bg-white rounded-2xl p-4 mb-3">
                  <p className="text-xl font-bold text-green-600 mb-2">{word.cn}</p>
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-sm text-gray-600">{word.example}</p>
                    <p className="text-xs text-gray-400 mt-1">{word.exampleCn}</p>
                  </div>
                </div>
              )}

              {!showAnswer && (
                <p className="text-gray-400 text-sm">点击下方按钮查看释义</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100">
          {!showAnswer ? (
            <button
              onClick={() => setShowAnswer(true)}
              className="btn-3d w-full bg-green-500 text-white py-4 rounded-2xl font-bold text-lg"
            >
              查看释义
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAnswer(false);
                  if (currentIdx + 1 < words.length) {
                    setCurrentIdx(i => i + 1);
                  } else {
                    startQuiz();
                  }
                }}
                className="flex-1 btn-3d bg-gray-200 text-gray-600 py-3 rounded-2xl font-bold"
              >
                再看一次
              </button>
              <button
                onClick={() => {
                  setShowAnswer(false);
                  if (currentIdx + 1 < words.length) {
                    setCurrentIdx(i => i + 1);
                  } else {
                    startQuiz();
                  }
                }}
                className="flex-1 btn-3d bg-green-500 text-white py-3 rounded-2xl font-bold"
              >
                下一个
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Quiz phase
  const q = quizQuestions[quizIdx];
  const progress = (quizIdx + 1) / quizQuestions.length;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <button onClick={onExit} className="text-gray-400">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-sm text-gray-500">测试 {quizIdx + 1} / {quizQuestions.length}</span>
        <div className="flex items-center gap-1">
          <Heart className="w-4 h-4 text-red-500 fill-red-500" />
          <span className="text-sm font-bold text-gray-600">{hearts}</span>
        </div>
      </div>

      <div className="px-4 py-2">
        <ProgressBar progress={progress} color="#58cc02" height={6} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 overflow-y-auto">
        <div key={quizIdx} className="w-full max-w-md">
          <p className="text-center text-gray-400 text-sm mb-2">这个单词是什么意思？</p>
          <div className="bg-green-50 rounded-2xl p-6 text-center mb-6 border-2 border-green-200">
            <button
              onClick={() => speak(q.word)}
              className="inline-flex items-center gap-2 text-2xl font-bold text-gray-800 hover:text-green-600 transition-colors"
            >
              {q.word}
              <Volume2 className="w-5 h-5 text-green-500" />
            </button>
            <p className="text-gray-400 text-sm mt-1">{q.phonetic}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {q.options.map((option, idx) => {
              const isSelected = selectedAnswer === idx;
              const isCorrect = idx === q.answerIdx;
              let bgClass = 'bg-white border-gray-200 text-gray-700';
              let borderClass = 'border-2';

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
                  className={`${bgClass} ${borderClass} rounded-2xl py-4 px-3 font-medium text-sm transition-all ${!feedback ? 'btn-3d' : ''}`}
                >
                  {option}
                  {feedback && isCorrect && <Check className="inline w-4 h-4 ml-1" />}
                  {feedback && isSelected && !isCorrect && <X className="inline w-4 h-4 ml-1" />}
                </button>
              );
            })}
          </div>

          {feedback && (
            <div className={`mt-4 rounded-2xl p-4 ${feedback === 'correct' ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className={`font-bold ${feedback === 'correct' ? 'text-green-600' : 'text-red-600'}`}>
                {feedback === 'correct' ? '✓ 回答正确！' : '✗ 正确答案：' + q.correctAnswer}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-100">
        {feedback ? (
          <button
            onClick={nextQuestion}
            className="btn-3d w-full bg-green-500 text-white py-4 rounded-2xl font-bold text-lg"
          >
            {quizIdx + 1 < quizQuestions.length ? '下一题' : '完成测试'}
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
