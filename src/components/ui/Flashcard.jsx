export default function Flashcard({ flipped, onFlip, front, back }) {
  return (
    <div className="flashcard-container" onClick={onFlip} role="button" tabIndex={0}>
      <div className={`flashcard ${flipped ? 'flipped' : ''}`}>
        <div className="flashcard__face flashcard__front">{front}</div>
        <div className="flashcard__face flashcard__back">{back}</div>
      </div>
    </div>
  );
}
