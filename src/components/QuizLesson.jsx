import { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Check, X, Heart, Volume2, ChevronRight } from 'lucide-react';
import ProgressBar from './ProgressBar';
import DuolingoButton from './ui/DuolingoButton';
import { useTutor } from '../context/TutorContext';
import { buildPresenceScene } from '../lib/tutorScene';
import { reportAnswer } from '../lib/reportAnswer';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const SECTION_COLOR_VAR = {
  vocabulary: 'var(--skill-vocab)',
  grammar: 'var(--skill-grammar)',
  reading: 'var(--skill-reading)',
  listening: 'var(--skill-listening)',
  writing: 'var(--skill-writing)',
  speaking: 'var(--skill-speaking)',
};

const SECTION_SHADOW_VAR = {
  vocabulary: 'var(--skill-vocab-shadow)',
  grammar: 'var(--skill-grammar-shadow)',
  reading: 'var(--skill-reading-shadow)',
  listening: 'var(--skill-listening-shadow)',
  writing: 'var(--skill-writing-shadow)',
  speaking: 'var(--skill-speaking-shadow)',
};

export default function QuizLesson({ level, section, gameState, maxLevels, onComplete, onExit }) {
  const hasLesson = !!level.lesson;
  const hasPassage = !!level.passage;
  const questions = level.quiz || level.questions || [];
  const { setPresence } = useTutor();

  const [phase, setPhase] = useState(hasLesson ? 'lesson' : hasPassage ? 'passage' : 'quiz');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [wrongCount, setWrongCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [hearts, setHearts] = useState(gameState.hearts);

  const colorVar = SECTION_COLOR_VAR[section] || 'var(--skill-grammar)';
  const shadowVar = SECTION_SHADOW_VAR[section] || 'var(--skill-grammar-shadow)';

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
      setCorrectCount((c) => c + 1);
    } else {
      setWrongCount((c) => c + 1);
      setHearts((h) => Math.max(0, h - 1));
      gameState.loseHeart();
    }
    void reportAnswer({
      questionId: q.id || `${level.id}-q-${currentIdx}`,
      levelId: level.id,
      section,
      isCorrect: correct,
    });
  };

  useEffect(() => {
    if (phase === 'lesson') {
      setPresence(
        buildPresenceScene({
          surface: 'lesson',
          section,
          levelId: level.id,
          levelTitle: level.title,
          phase: 'lesson',
          content: { type: 'lesson', lesson: level.lesson, examples: level.examples },
        }),
      );
    } else if (phase === 'passage') {
      setPresence(
        buildPresenceScene({
          surface: 'lesson',
          section,
          levelId: level.id,
          levelTitle: level.title,
          phase: 'passage',
          content: {
            type: 'passage',
            passage_excerpt: (level.passage || '').slice(0, 400),
            hasFullPassage: true,
          },
        }),
      );
    } else if (phase === 'quiz' && questions[currentIdx]) {
      const q = questions[currentIdx];
      setPresence(
        buildPresenceScene({
          surface: 'lesson',
          section,
          levelId: level.id,
          levelTitle: level.title,
          phase: 'quiz',
          itemIndex: currentIdx,
          itemTotal: questions.length,
          answerState:
            feedback === 'correct'
              ? 'answered_correct'
              : feedback === 'wrong'
                ? 'answered_wrong'
                : 'unanswered',
          content: {
            type: 'quiz',
            question: q.question || `选择填入第${q.blank}空的正确答案`,
            options: q.options,
            ...(feedback
              ? {
                  answer: q.answer,
                  explanation: q.explanation,
                }
              : {}),
          },
        }),
      );
    }
  }, [phase, currentIdx, feedback, questions, level, section, setPresence]);

  const nextQuestion = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((i) => i + 1);
      setSelectedAnswer(null);
      setFeedback(null);
    } else {
      const stars = wrongCount === 0 ? 3 : wrongCount <= 2 ? 2 : 1;
      gameState.completeLevel(section, level.id, correctCount, questions.length, wrongCount, maxLevels);
      onComplete(stars, correctCount, questions.length, wrongCount);
    }
  };

  if (hearts === 0) {
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

  // Lesson phase (grammar lesson)
  if (phase === 'lesson') {
    return (
      <div className="lesson-shell">
        <div className="lesson-shell__header">
          <button className="lesson-shell__back" onClick={onExit} aria-label="退出">
            <ArrowLeft />
          </button>
          <span className="lesson-shell__title">语法讲解</span>
          <div className="lesson-shell__hearts">
            <Heart width={16} height={16} fill="currentColor" />
            <span>{hearts}</span>
          </div>
        </div>

        <div className="lesson-shell__body" style={{ justifyContent: 'flex-start' }}>
          <div style={{ width: '100%', maxWidth: 480 }}>
            <div
              className="quiz__question-card"
              style={{
                textAlign: 'left',
                background: 'var(--color-surface)',
                borderColor: colorVar,
                borderBottomColor: shadowVar,
                marginBottom: 16,
              }}
            >
              <h2 style={{ color: colorVar, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem', marginBottom: 12 }}>
                {level.title}
              </h2>
              <div style={{ color: 'var(--color-text)', fontSize: '0.9375rem', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                {level.lesson}
              </div>
            </div>

            {level.examples && level.examples.length > 0 && (
              <div
                style={{
                  background: 'var(--color-bg-secondary)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 16,
                }}
              >
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text)', marginBottom: 12 }}>
                  例句
                </h3>
                {level.examples.map((ex, idx) => (
                  <div key={idx} style={{ marginBottom: 12 }}>
                    <p style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: 'var(--color-text)', fontSize: '0.875rem', fontWeight: 500 }}>
                      <button
                        onClick={() => speak(ex.en)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', padding: 0, marginTop: 2, flexShrink: 0, cursor: 'pointer' }}
                        aria-label="发音"
                      >
                        <Volume2 width={16} height={16} />
                      </button>
                      <span>{ex.en}</span>
                    </p>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', marginTop: 2, marginLeft: 24 }}>
                      {ex.cn}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lesson-shell__footer">
          <DuolingoButton variant="primary" onClick={() => setPhase('quiz')}>
            开始练习 ({questions.length}题)
            <ChevronRight width={16} height={16} />
          </DuolingoButton>
        </div>
      </div>
    );
  }

  // Passage phase (reading/exam)
  if (phase === 'passage') {
    return (
      <div className="lesson-shell">
        <div className="lesson-shell__header">
          <button className="lesson-shell__back" onClick={onExit} aria-label="退出">
            <ArrowLeft />
          </button>
          <span className="lesson-shell__title">阅读理解</span>
          <div className="lesson-shell__hearts">
            <Heart width={16} height={16} fill="currentColor" />
            <span>{hearts}</span>
          </div>
        </div>

        <div className="lesson-shell__body" style={{ justifyContent: 'flex-start' }}>
          <div style={{ width: '100%', maxWidth: 480 }}>
            <div
              className="quiz__question-card"
              style={{
                textAlign: 'left',
                background: 'var(--color-surface)',
                borderColor: colorVar,
                borderBottomColor: shadowVar,
              }}
            >
              <h2 style={{ color: colorVar, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.125rem', marginBottom: 12 }}>
                {level.title}
              </h2>
              <div style={{ color: 'var(--color-text)', fontSize: '0.875rem', lineHeight: 1.7, whiteSpace: 'pre-line', marginBottom: 12 }}>
                {level.passage}
              </div>
              {level.passageCn && (
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: 4 }}>中文翻译：</p>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                    {level.passageCn}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lesson-shell__footer">
          <DuolingoButton variant="primary" onClick={() => setPhase('quiz')}>
            开始答题 ({questions.length}题)
            <ChevronRight width={16} height={16} />
          </DuolingoButton>
        </div>
      </div>
    );
  }

  // Quiz phase
  const q = questions[currentIdx];
  const progress = (currentIdx + 1) / questions.length;

  return (
    <div className="lesson-shell">
      <div className="lesson-shell__header">
        <button className="lesson-shell__back" onClick={onExit} aria-label="退出">
          <ArrowLeft />
        </button>
        <span className="lesson-shell__title">
          {currentIdx + 1} / {questions.length}
        </span>
        <div className="lesson-shell__hearts">
          <Heart width={16} height={16} fill="currentColor" />
          <span>{hearts}</span>
        </div>
      </div>

      <div className="lesson-shell__progress">
        <ProgressBar progress={progress} color={colorVar} />
      </div>

      <div className="lesson-shell__body">
        <div style={{ width: '100%', maxWidth: 480 }} key={currentIdx}>
          {level.type === 'cloze' && q.blank && (
            <div
              style={{
                background: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                padding: 16,
                marginBottom: 16,
                maxHeight: 160,
                overflowY: 'auto',
              }}
            >
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: 4 }}>完形填空原文：</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                {level.passage}
              </p>
            </div>
          )}

          <div className="quiz__question-card" style={{ marginBottom: 24, borderColor: colorVar, borderBottomColor: shadowVar }}>
            <p className="quiz__question-text" style={{ fontSize: '1.0625rem' }}>
              {q.question || `选择填入第${q.blank}空的正确答案`}
            </p>
          </div>

          <div className="quiz__options">
            {q.options.map((option, idx) => {
              const isSelected = selectedAnswer === idx;
              const isCorrect = idx === q.answer;
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
                <strong>{feedback === 'correct' ? '回答正确！' : '答错了'}</strong>
                {q.explanation && <span>{q.explanation}</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="lesson-shell__footer">
        {feedback ? (
          <DuolingoButton variant="primary" onClick={nextQuestion}>
            {currentIdx + 1 < questions.length ? '下一题' : '完成'}
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
