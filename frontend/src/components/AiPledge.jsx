import React, { useState, useEffect, useRef } from 'react';
import { getAssetUrl } from '../config/api';
import { ShieldCheck, Award, ArrowRight, ArrowLeft, CheckCircle2, Download, RotateCcw, Sparkles, User, CheckCircle, XCircle, Lightbulb } from 'lucide-react';
import confetti from 'canvas-confetti';

const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: "What should you do before using AI-generated information?",
    options: [
      "Share it immediately",
      "Trust it blindly",
      "Verify AI-generated information before using it.",
      "Ignore it"
    ],
    correctIndex: 2,
    explanation: "AI can make mistakes, so information should always be verified before using it."
  },
  {
    id: 2,
    question: "When using AI, personal or confidential information should:",
    options: [
      "Be shared with any AI tool.",
      "Be posted publicly for better results.",
      "Be protected and shared only when appropriate.",
      "Not matter."
    ],
    correctIndex: 2,
    explanation: "Personal and confidential information must be protected to ensure privacy and security."
  },
  {
    id: 3,
    question: "AI should be used to:",
    options: [
      "Replace human judgment completely.",
      "Create fake or misleading content.",
      "Support learning, innovation, and responsible decision-making.",
      "Harm others online."
    ],
    correctIndex: 2,
    explanation: "AI should empower human learning, innovation, and positive real-world decision making."
  },
  {
    id: 4,
    question: "Who is ultimately responsible for decisions made using AI?",
    options: [
      "The AI tool alone",
      "The user or organization using the AI",
      "The internet",
      "No one"
    ],
    correctIndex: 1,
    explanation: "The user or organization using the AI remains accountable for all final decisions."
  },
  {
    id: 5,
    question: "If you use AI to create a report, presentation, or assignment, what is the best practice?",
    options: [
      "Claim it was entirely your own work.",
      "Hide the fact that AI was used.",
      "Review, improve, and acknowledge AI assistance when required.",
      "Submit it without reading it."
    ],
    correctIndex: 2,
    explanation: "Reviewing, refining, and acknowledging AI assistance upholds academic and professional integrity."
  }
];

const OATH_TEXT = `Today, I pledge to use Artificial Intelligence responsibly, ethically, and for the benefit of society. I will verify AI-generated information, respect privacy and intellectual property, avoid bias, reject misinformation and misuse, and uphold honesty, fairness, and accountability in all my actions. I will use AI to learn, innovate, solve real-world problems, and create a positive impact. Together, we commit to building a future where AI serves humanity with responsibility, integrity, and trust.`;

// Interactive 3D Badge View Component (LeetCode Badge Style)
function ThreeDBadgeCard({ name }) {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [shine, setShine] = useState({ x: 50, y: 50, opacity: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = -((y - centerY) / centerY) * 22; // max 22 deg tilt
    const rotateY = ((x - centerX) / centerX) * 22;

    const shineX = (x / rect.width) * 100;
    const shineY = (y / rect.height) * 100;

    setRotate({ x: rotateX, y: rotateY });
    setShine({ x: shineX, y: shineY, opacity: 0.85 });
  };

  const handleMouseEnter = () => setIsHovered(true);

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotate({ x: 0, y: 0 });
    setShine({ x: 50, y: 50, opacity: 0 });
  };

  return (
    <div className="badge-3d-scene">
      <div
        ref={cardRef}
        className={`badge-3d-card ${isHovered ? 'hovered' : 'idle-float'}`}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: isHovered
            ? `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale3d(1.04, 1.04, 1.04)`
            : undefined
        }}
      >
        {/* Dynamic 3D Ambient Shadow */}
        <div
          className="badge-3d-shadow"
          style={{
            transform: isHovered
              ? `translate3d(${-rotate.y * 1.5}px, ${rotate.x * 1.5 + 25}px, -40px)`
              : undefined
          }}
        />

        {/* Base Badge Image Layer */}
        <div className="badge-3d-layer base-layer">
          <img
            src={getAssetUrl('/ai-badge.png')}
            alt="AI Pledge Badge 3D"
            className="badge-image"
          />
        </div>

        {/* Holographic Metallic Sheen Layer */}
        <div
          className="badge-3d-layer sheen-layer"
          style={{
            background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.12) 35%, transparent 70%)`,
            opacity: shine.opacity
          }}
        />

        {/* 3D Floating Name Overlay Layer */}
        <div className="badge-3d-layer name-layer">
          <div className="badge-name-overlay text-3d-floating">
            {name.trim() || 'Responsible AI Citizen'}
          </div>
        </div>

        {/* Dynamic 3D Badge Border Sheen */}
        <div className="badge-3d-border-glow" />
      </div>
    </div>
  );
}

export default function AiPledge() {
  // Step state: 1 = Name Entry, 2 = Quiz, 3 = Oath, 4 = Badge
  const [step, setStep] = useState(1);
  const [name, setName] = useState(() => localStorage.getItem('ai_pledge_user_name') || '');
  const [nameError, setNameError] = useState('');

  // Quiz state (1 question per step: 0 to 4)
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [answers, setAnswers] = useState({});

  // Oath timer state (30 seconds word by word)
  const oathWords = OATH_TEXT.split(' ');
  const [activeWordIndex, setActiveWordIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [oathCompleted, setOathCompleted] = useState(false);

  // Focus name input or load saved name
  useEffect(() => {
    const saved = localStorage.getItem('ai_pledge_user_name');
    if (saved) setName(saved);
  }, []);

  // Handle Name Submit
  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError('Please enter your name to proceed.');
      return;
    }
    setNameError('');
    localStorage.setItem('ai_pledge_user_name', name.trim());
    setStep(2);
    setCurrentQIdx(0);
  };

  // Select quiz option for current question
  const handleSelectOption = (questionId, optionIndex) => {
    // Only allow selecting if not answered yet for this question
    if (answers[questionId] !== undefined) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleNextQuizQuestion = () => {
    if (currentQIdx < QUIZ_QUESTIONS.length - 1) {
      setCurrentQIdx(prev => prev + 1);
    } else {
      // Completed all 5 questions -> Go to Oath step
      setStep(3);
    }
  };

  // Oath 30-second word-by-word animation timer
  useEffect(() => {
    if (step !== 3) return;

    setActiveWordIndex(0);
    setSecondsLeft(30);
    setOathCompleted(false);

    const totalTimeMs = 30000;
    const intervalMs = 100;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += intervalMs;
      const progress = Math.min(elapsed / totalTimeMs, 1);
      
      const currentWordIdx = Math.floor(progress * oathWords.length);
      setActiveWordIndex(currentWordIdx);

      const remSec = Math.max(0, Math.ceil(30 - (elapsed / 1000)));
      setSecondsLeft(remSec);

      if (elapsed >= totalTimeMs) {
        clearInterval(timer);
        setActiveWordIndex(oathWords.length);
        setOathCompleted(true);
        setSecondsLeft(0);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [step]);

  // Trigger celebration on badge step arrival
  useEffect(() => {
    if (step === 4) {
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch (e) {
        console.log('Confetti trigger:', e);
      }
    }
  }, [step]);

  // Canvas downloader function
  const handleDownloadBadge = () => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = getAssetUrl('/ai-badge.png');

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width || 3375;
      canvas.height = img.height || 3375;
      const ctx = canvas.getContext('2d');

      // Draw background badge image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw user name in the middle area
      const text = name.trim() || 'Responsible AI Citizen';
      
      // Calculate font size dynamically based on length
      let fontSize = 155;
      if (text.length > 20) fontSize = 115;
      if (text.length > 28) fontSize = 90;

      ctx.font = `bold ${fontSize}px "Inter", "Segoe UI", Roboto, sans-serif`;
      ctx.fillStyle = '#FFFFFF'; // Pure white text
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 18;

      // Middle position height (lowered slightly to 48%)
      const posY = canvas.height * 0.48;
      ctx.fillText(text, canvas.width / 2, posY);

      // Trigger download
      const link = document.createElement('a');
      link.download = `AI_Pledge_Badge_${text.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
  };

  const currentQ = QUIZ_QUESTIONS[currentQIdx];
  const selectedOpt = answers[currentQ?.id];
  const isQuestionAnswered = selectedOpt !== undefined;

  return (
    <div className="pledge-container">
      {/* STEP 1: ENTER NAME */}
      {step === 1 && (
        <div className="step1-container fade-in">
          <h2 className="step1-title">Enter your name</h2>
          <p className="step1-subtitle">This name will appear on your pledge badge.</p>

          <form onSubmit={handleNameSubmit} className="step1-form">
            <div className="step1-input-wrapper">
              <User size={18} className="step1-user-icon" />
              <input
                id="user-name-input"
                type="text"
                className="step1-input"
                placeholder="Your name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError('');
                }}
                autoFocus
              />
            </div>
            {nameError && <p className="error-text text-center">{nameError}</p>}

            <button type="submit" className="step1-submit-btn">
              Continue to Quiz <ArrowRight size={18} />
            </button>
          </form>
        </div>
      )}

      {/* STEP 2: QUIZ SECTION (MATCHING USER SCREENSHOTS) */}
      {step === 2 && currentQ && (
        <div className="quiz-container-card fade-in">
          {/* HEADER TAG & QUESTION COUNTER */}
          <div className="quiz-top-bar">
            <span className="quiz-tag-label">RESPONSIBLE AI QUIZ</span>
            <span className="quiz-question-counter">
              QUESTION {currentQIdx + 1} / {QUIZ_QUESTIONS.length}
            </span>
          </div>

          {/* PROGRESS LINE */}
          <div className="quiz-progress-line-bg">
            <div
              className="quiz-progress-line-fill"
              style={{ width: `${((currentQIdx + 1) / QUIZ_QUESTIONS.length) * 100}%` }}
            ></div>
          </div>

          {/* QUESTION TITLE & SUBTITLE */}
          <div className="quiz-content-area">
            <h2 className="quiz-question-title">{currentQ.question}</h2>
            <p className="quiz-select-hint">SELECT THE CORRECT ANSWER</p>

            {/* OPTIONS LIST WITH INTERACTIVE FEEDBACK */}
            <div className="quiz-options-list">
              {currentQ.options.map((option, optIdx) => {
                const isCorrect = optIdx === currentQ.correctIndex;
                const isUserSelected = selectedOpt === optIdx;

                let optionStateClass = '';
                let iconComponent = <div className="quiz-circle-empty" />;

                if (isQuestionAnswered) {
                  if (isCorrect) {
                    optionStateClass = 'state-correct';
                    iconComponent = <CheckCircle size={20} className="icon-correct" />;
                  } else if (isUserSelected && !isCorrect) {
                    optionStateClass = 'state-wrong';
                    iconComponent = <XCircle size={20} className="icon-wrong" />;
                  } else {
                    optionStateClass = 'state-dimmed';
                  }
                }

                return (
                  <button
                    key={optIdx}
                    type="button"
                    className={`quiz-option-card ${optionStateClass}`}
                    onClick={() => handleSelectOption(currentQ.id, optIdx)}
                    disabled={isQuestionAnswered}
                  >
                    <span className="quiz-option-text">{option}</span>
                    <div className="quiz-option-status">{iconComponent}</div>
                  </button>
                );
              })}
            </div>

            {/* LIGHTBULB EXPLANATION CALLOUT BOX */}
            {isQuestionAnswered && (
              <div className="quiz-explanation-box fade-in">
                <Lightbulb size={20} className="lightbulb-icon" />
                <span className="explanation-text">{currentQ.explanation}</span>
              </div>
            )}

            {/* QUIZ NAVIGATION ACTION BAR */}
            <div className="quiz-action-bar">
              <button
                type="button"
                className="quiz-back-btn"
                onClick={() => {
                  if (currentQIdx === 0) {
                    setStep(1); // Go back to Name Entry screen
                  } else {
                    setCurrentQIdx(prev => prev - 1);
                  }
                }}
              >
                <ArrowLeft size={18} /> {currentQIdx === 0 ? 'Back to Name' : 'Previous'}
              </button>

              <button
                type="button"
                className={`quiz-next-btn ${!isQuestionAnswered ? 'disabled' : ''}`}
                disabled={!isQuestionAnswered}
                onClick={handleNextQuizQuestion}
              >
                {currentQIdx < QUIZ_QUESTIONS.length - 1 ? (
                  <>Next Question <ArrowRight size={18} /></>
                ) : (
                  <>Complete Quiz & Proceed to Oath <ArrowRight size={18} /></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: RESPONSIBLE & ETHICAL AI OATH */}
      {step === 3 && (
        <div className="pledge-card oath-card fade-in">
          <div className="oath-header">
            <h2 className="pledge-title text-center">Responsible & Ethical AI Oath</h2>
            <p className="pledge-subtitle text-center">
              Please read the oath carefully. As the text lights up word by word, recite each word to commit to ethical AI usage.
            </p>
          </div>

          {/* OATH TELEPROMPTER BOX */}
          <div className="oath-box">
            <div className="oath-words-grid">
              {oathWords.map((word, idx) => {
                const isLit = idx < activeWordIndex;
                return (
                  <span
                    key={idx}
                    className={`oath-word ${isLit ? 'lit' : 'dim'}`}
                  >
                    {word}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="oath-actions">
            <button
              type="button"
              className={`cta-button primary-cta ${!oathCompleted ? 'disabled-btn' : ''}`}
              disabled={!oathCompleted}
              onClick={() => setStep(4)}
            >
              {oathCompleted ? (
                <>I Solemnly Pledge & Claim My Badge <ArrowRight size={18} /></>
              ) : (
                <>Reciting Oath...</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: 3D BADGE DISPLAY & DOWNLOAD */}
      {step === 4 && (
        <div className="pledge-card badge-card fade-in">
          <div className="badge-header text-center">
            <div className="success-icon-badge">
              <Award size={48} color="var(--primary-cyan)" />
            </div>
            <h2 className="pledge-title">You're a Responsible AI Citizen!</h2>
            <p className="pledge-subtitle">
              Here is your official honorary AI Pledge Badge. Wear your commitment to ethical AI with pride!
            </p>
          </div>

          {/* INTERACTIVE 3D BADGE VIEW */}
          <ThreeDBadgeCard name={name} />

          {/* BADGE ACTIONS */}
          <div className="badge-actions">
            <button
              type="button"
              className="cta-button primary-cta glow-btn"
              onClick={handleDownloadBadge}
            >
              <Download size={20} /> Download Badge (PNG)
            </button>

            <button
              type="button"
              className="cta-button secondary-cta"
              onClick={() => {
                setStep(1);
                setCurrentQIdx(0);
                setAnswers({});
              }}
            >
              <RotateCcw size={18} /> Retake Pledge
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

