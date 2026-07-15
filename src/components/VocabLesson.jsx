import { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Volume2, Check, X, Heart, ChevronRight, RotateCw } from 'lucide-react';
import ProgressBar from './ProgressBar';
import Flashcard from './ui/Flashcard';
import DuolingoButton from './ui/DuolingoButton';
import { useTutor } from '../context/TutorContext';
import { buildPresenceScene } from '../lib/tutorScene';
import { reportAnswer } from '../lib/reportAnswer';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function VocabLesson({ level, gameState, maxLevels, onComplete, onExit }) {
  const { words } = level;
  const [phase, setPhase] = useState('learn');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
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
    const questions = words.map((word) => {
      const otherMeanings = words
        .filter((w) => w.en !== word.en)
        .map((w) => w.cn)
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
      setQuizCorrectCount((c) => c + 1);
    } else {
      setQuizWrongCount((c) => c + 1);
      setHearts((h) => Math.max(0, h - 1));
      gameState.loseHeart();
    }
    void reportAnswer({
      questionId: `${level.id}-vocab-${quizIdx}`,
      levelId: level.id,
      section: 'vocabulary',
      isCorrect: correct,
    });
  };

  useEffect(() => {
    if (phase === 'learn' && words[currentIdx]) {
      const word = words[currentIdx];
      setPresence(
        buildPresenceScene({
          surface: 'lesson',
          section: 'vocabulary',
          levelId: level.id,
          levelTitle: level.title,
          phase: 'learn',
          itemIndex: currentIdx,
          itemTotal: words.length,
          answerState: 'unanswered',
          content: {
            type: 'word',
            en: word.en,
            cn: word.cn,
            phonetic: word.phonetic,
            example: word.example,
            example_cn: word.exampleCn,
          },
        }),
      );
    } else if (phase === 'quiz' && quizQuestions[quizIdx]) {
      const q = quizQuestions[quizIdx];
      setPresence(
        buildPresenceScene({
          surface: 'lesson',
          section: 'vocabulary',
          levelId: level.id,
          levelTitle: level.title,
          phase: 'quiz',
          itemIndex: quizIdx,
          itemTotal: quizQuestions.length,
          answerState:
            feedback === 'correct'
              ? 'answered_correct'
              : feedback === 'wrong'
                ? 'answered_wrong'
                : 'unanswered',
          content: {
            type: 'vocab_quiz',
            word: q.word,
            options: q.options,
            ...(feedback ? { answer: q.correctAnswer } : {}),
          },
        }),
      );
    }
  }, [phase, currentIdx, quizIdx, feedback, words, quizQuestions, level, setPresence]);

  const nextQuestion = () => {
    if (quizIdx + 1 < quizQuestions.length) {
      setQuizIdx((i) => i + 1);
      setSelectedAnswer(null);
      setFeedback(null);
    } else {
      const stars = quizWrongCount === 0 ? 3 : quizWrongCount <= 2 ? 2 : 1;
      gameState.completeLevel(
        'vocabulary',
        level.id,
        quizCorrectCount,
        quizQuestions.length,
        quizWrongCount,
        maxLevels,
      );
      onComplete(stars, quizCorrectCount, quizQuestions.length, quizWrongCount);
    }
  };

  const advanceFlashcard = () => {
    setFlipped(false);
    if (currentIdx + 1 < words.length) {
      setCurrentIdx((i) => i + 1);
    } else {
      startQuiz();
    }
  };

  if (hearts === 0 && phase === 'quiz') {
    return (
      <div className="empty-hearts">
        <div>
          <Heart className="empty-hearts__icon" fill="currentColor" />
          <h2 className="empty-hearts__title">体力用完了！</h2>
          <p className="empty-hearts__desc">用宝石可以恢复体力，继续闯关</p>
          <DuolingoButton
            variant="info"
            disabled={gameState.gems < 30}
            onClick={() => {
              gameState.refillHearts();
              setHearts(gameState.maxHearts);
            }}
            style={{ marginBottom: 12 }}
          >
            💎 30 恢复体力
          </DuolingoButton>
          <button
            onClick={onExit}
            style={{
              display: 'block',
              width: '100%',
              color: 'var(--color-text-secondary)',
              fontSize: '0.875rem',
              padding: '8px 0',
              background: 'none',
              border: 'none',
            }}
          >
            退出关卡
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'learn') {
    const word = words[currentIdx];
    return (
      <div className="lesson-shell">
        <div className="lesson-shell__header">
          <button className="lesson-shell__back" onClick={onExit} aria-label="退出">
            <ArrowLeft />
          </button>
          <span className="lesson-shell__title">
            闪卡 {currentIdx + 1} / {words.length}
          </span>
          <div className="lesson-shell__hearts">
            <Heart width={16} height={16} fill="currentColor" />
            <span>{hearts}</span>
          </div>
        </div>

        <div className="lesson-shell__progress">
          <ProgressBar progress={(currentIdx + 1) / words.length} color="var(--skill-vocab)" />
        </div>

        <div className="lesson-shell__body">
          <Flashcard
            flipped={flipped}
            onFlip={() => setFlipped((f) => !f)}
            front={
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    speak(word.en);
                  }}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'var(--skill-vocab)',
                    border: 'none',
                    color: 'var(--color-on-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}
                  aria-label="发音"
                >
                  <Volume2 width={24} height={24} />
                </button>
                <div className="flashcard__word">{word.en}</div>
                <div className="flashcard__phonetic">{word.phonetic}</div>
                <div className="flashcard__hint">点击卡片查看释义</div>
              </>
            }
            back={
              <>
                <div className="flashcard__meaning">{word.cn}</div>
                {word.example && (
                  <div className="flashcard__example">
                    {word.example}
                    {word.exampleCn && (
                      <>
                        <br />
                        <span style={{ color: 'var(--color-text-secondary)' }}>{word.exampleCn}</span>
                      </>
                    )}
                  </div>
                )}
              </>
            }
          />
        </div>

        <div className="lesson-shell__footer">
          {!flipped ? (
            <DuolingoButton variant="primary" onClick={() => setFlipped(true)}>
              查看释义
            </DuolingoButton>
          ) : (
            <div className="flashcard__actions">
              <DuolingoButton variant="secondary" onClick={() => setFlipped(false)}>
                <RotateCw width={16} height={16} />
                再看
              </DuolingoButton>
              <DuolingoButton variant="primary" onClick={advanceFlashcard}>
                {currentIdx + 1 < words.length ? '下一个' : '开始测试'}
                <ChevronRight width={16} height={16} />
              </DuolingoButton>
            </div>
          )}
        </div>
      </div>
    );
  }

  const q = quizQuestions[quizIdx];
  const progress = (quizIdx + 1) / quizQuestions.length;

  return (
    <div className="lesson-shell">
      <div className="lesson-shell__header">
        <button className="lesson-shell__back" onClick={onExit} aria-label="退出">
          <ArrowLeft />
        </button>
        <span className="lesson-shell__title">
          测试 {quizIdx + 1} / {quizQuestions.length}
        </span>
        <div className="lesson-shell__hearts">
          <Heart width={16} height={16} fill="currentColor" />
          <span>{hearts}</span>
        </div>
      </div>

      <div className="lesson-shell__progress">
        <ProgressBar progress={progress} color="var(--skill-vocab)" />
      </div>

      <div className="lesson-shell__body">
        <div style={{ width: '100%', maxWidth: 400 }} key={quizIdx}>
          <p
            style={{
              textAlign: 'center',
              color: 'var(--color-text-secondary)',
              fontSize: '0.875rem',
              marginBottom: 8,
            }}
          >
            这个单词是什么意思？
          </p>
          <div
            className="quiz__question-card"
            style={{ marginBottom: 24, background: 'var(--green-pale-bg)', borderColor: 'var(--green-pale-border)' }}
          >
            <button
              onClick={() => speak(q.word)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'none',
                border: 'none',
                color: 'var(--duo-green-deep)',
                fontSize: '1.5rem',
                fontWeight: 800,
                fontFamily: 'var(--font-display)',
              }}
            >
              {q.word}
              <Volume2 width={20} height={20} />
            </button>
            <div className="flashcard__phonetic" style={{ marginTop: 4 }}>
              {q.phonetic}
            </div>
          </div>

          <div className="quiz__options">
            {q.options.map((option, idx) => {
              const isSelected = selectedAnswer === idx;
              const isCorrect = idx === q.answerIdx;
              let stateClass = '';
              if (feedback) {
                if (isCorrect) stateClass = 'quiz__option--correct';
                else if (isSelected) stateClass = 'quiz__option--wrong';
                else stateClass = 'quiz__option--muted';
              }
              return (
                <button
                  key={idx}
                  className={`quiz__option ${stateClass}`}
                  onClick={() => handleAnswer(idx)}
                  disabled={!!feedback}
                >
                  <span className="quiz__option-letter">{LETTERS[idx]}</span>
                  <span style={{ flex: 1 }}>{option}</span>
                  {feedback && isCorrect && <Check width={20} height={20} />}
                  {feedback && isSelected && !isCorrect && <X width={20} height={20} />}
                </button>
              );
            })}
          </div>

          {feedback && (
            <div className={`quiz__feedback quiz__feedback--${feedback}`} style={{ marginTop: 16 }}>
              <div className="quiz__feedback-icon">
                {feedback === 'correct' ? <Check width={18} height={18} /> : <X width={18} height={18} />}
              </div>
              <div className="quiz__feedback-text">
                <strong>
                  {feedback === 'correct' ? '回答正确！' : '正确答案：' + q.correctAnswer}
                </strong>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="lesson-shell__footer">
        {feedback ? (
          <DuolingoButton variant="primary" onClick={nextQuestion}>
            {quizIdx + 1 < quizQuestions.length ? '下一题' : '完成测试'}
            <ChevronRight width={16} height={16} />
          </DuolingoButton>
        ) : (
          <DuolingoButton variant="secondary" disabled>
            选择答案
          </DuolingoButton>
        )}
      </div>
    </div>
  );
}
