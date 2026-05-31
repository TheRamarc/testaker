import React, { useEffect, useMemo, useState } from 'react';
import { getTextTestById, Question, saveTextTestAttempt, TextTest } from '../lib/db';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { createImageObjectUrl, revokeObjectUrls } from '../lib/filePreview';

interface TextTestModeProps {
  testId: number;
  onExit?: () => void;
}

export const TextTestMode: React.FC<TextTestModeProps> = ({ testId, onExit }) => {
  const [selectedTest, setSelectedTest] = useState<TextTest | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [questionImages, setQuestionImages] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [completedSeconds, setCompletedSeconds] = useState<number | null>(null);

  useEffect(() => {
    loadTest(testId);
  }, [testId]);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    if (selectedTest) {
      appWindow.setFullscreen(true).catch(console.error);
    }

    return () => {
      appWindow.setFullscreen(false).catch(console.error);
    };
  }, [selectedTest]);

  useEffect(() => {
    return () => revokeObjectUrls(Object.values(questionImages));
  }, [questionImages]);

  useEffect(() => {
    if (!startedAt || showResult) return;

    const updateElapsed = () => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    };
    updateElapsed();
    const timerId = window.setInterval(updateElapsed, 1000);

    return () => window.clearInterval(timerId);
  }, [startedAt, showResult]);

  const questions = selectedTest?.questions ?? [];
  const currentQuestion = questions[currentIndex];
  const isPhotoTest = useMemo(
    () => questions.some(question => !!question.imagePath),
    [questions]
  );

  const loadTest = async (id: number) => {
    setLoading(true);
    try {
      const test = await getTextTestById(id);
      if (!test) return;

      const imageEntries = await Promise.all(
        test.questions
          .filter((question): question is Question & { id: number; imagePath: string } => !!question.id && !!question.imagePath)
          .map(async question => [question.id, await createImageObjectUrl(question.imagePath)] as const)
      );

      setQuestionImages(currentImages => {
        revokeObjectUrls(Object.values(currentImages));
        return Object.fromEntries(imageEntries);
      });
      setSelectedTest(test);
      setCurrentIndex(0);
      setUserAnswers({});
      setShowResult(false);
      setScore(0);
      setStartedAt(Date.now());
      setElapsedSeconds(0);
      setCompletedSeconds(null);
    } catch (error) {
      console.error('Failed to load test:', error);
      alert('Failed to load test: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  const getCorrectOption = (question: Question) => {
    return question.options.find(option => option.isCorrect)?.text;
  };

  const calculateScore = async () => {
    if (!selectedTest?.id) return;

    const nextScore = selectedTest.questions.reduce((total, question) => {
      if (!question.id) return total;
      return userAnswers[question.id] === getCorrectOption(question) ? total + 1 : total;
    }, 0);
    const finalSeconds = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : elapsedSeconds;

    setScore(nextScore);
    setElapsedSeconds(finalSeconds);
    setCompletedSeconds(finalSeconds);
    setShowResult(true);

    try {
      await saveTextTestAttempt({
        textTestId: selectedTest.id,
        score: nextScore,
        totalQuestions: selectedTest.questions.length,
        durationSeconds: finalSeconds,
        attemptedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to save test attempt:', error);
    }
  };

  const handleExit = () => {
    setSelectedTest(null);
    onExit?.();
  };

  if (loading || !selectedTest || !currentQuestion) {
    return (
      <div className="fixed inset-0 bg-sky-50 flex items-center justify-center z-50">
        <div className="text-zinc-500 font-black animate-pulse tracking-widest uppercase">
          {loading ? 'Loading Test...' : 'Failed to load test'}
        </div>
      </div>
    );
  }

  const questionId = currentQuestion.id ?? currentIndex;
  const selectedAnswer = userAnswers[questionId];
  const correctAnswer = getCorrectOption(currentQuestion);

  return (
    <div className="fixed inset-0 bg-sky-50 flex overflow-hidden z-50">
      <main className="flex-1 min-w-0 overflow-y-auto p-6 pt-20">
        <div className="fixed top-4 left-4 right-4 z-20 flex items-center justify-between gap-4">
          <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full border border-sky-200 text-zinc-900 text-xs font-black">
            {selectedTest.name} • Q{currentIndex + 1}/{questions.length} • {formatDuration(completedSeconds ?? elapsedSeconds)}
          </div>
          <button
            type="button"
            onClick={handleExit}
            className="text-white bg-red-600 hover:bg-red-500 px-4 py-2 rounded-xl text-xs font-black border border-red-500"
          >
            EXIT TEST
          </button>
        </div>

        <div className="max-w-5xl mx-auto space-y-6">
          <div className="bg-white border border-sky-200 rounded-2xl shadow-xl overflow-hidden">
            {currentQuestion.imagePath && currentQuestion.id && questionImages[currentQuestion.id] && (
              <div className="bg-zinc-950 flex items-center justify-center p-4">
                <img
                  src={questionImages[currentQuestion.id]}
                  alt={`Question ${currentIndex + 1}`}
                  className="max-h-[68vh] max-w-full object-contain rounded-lg"
                />
              </div>
            )}
            <div className="p-6">
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">
                {isPhotoTest ? 'Photo Question' : 'Question'} {currentIndex + 1}
              </div>
              {currentQuestion.text && (
                <h2 className="text-xl font-black text-zinc-900 leading-snug">{currentQuestion.text}</h2>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentQuestion.options.map(option => {
              const isSelected = selectedAnswer === option.text;
              const isCorrect = showResult && option.text === correctAnswer;
              const isWrong = showResult && isSelected && option.text !== correctAnswer;

              return (
                <button
                  key={option.text}
                  type="button"
                  disabled={showResult}
                  onClick={() => setUserAnswers(prev => ({ ...prev, [questionId]: option.text }))}
                  className={`min-h-14 px-4 py-3 rounded-xl border text-left font-black transition-all ${
                    isCorrect ? 'bg-green-100 border-green-500 text-green-800' :
                    isWrong ? 'bg-red-100 border-red-500 text-red-800' :
                    isSelected ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' :
                    'bg-white border-sky-200 text-zinc-700 hover:border-blue-300 hover:bg-sky-50'
                  }`}
                >
                  {option.text}
                </button>
              );
            })}
          </div>

          {showResult && (
            <div className="bg-white border border-sky-200 rounded-2xl p-6 text-center shadow-xl">
              <p className="text-zinc-500 text-xs font-black uppercase mb-1">Final Score</p>
              <h2 className="text-4xl font-black text-zinc-900">{score} <span className="text-zinc-600 text-lg">/ {questions.length}</span></h2>
              <p className="mt-2 text-zinc-500 text-xs font-black uppercase">Time Taken: {formatDuration(completedSeconds ?? elapsedSeconds)}</p>
            </div>
          )}
        </div>
      </main>

      <aside className="w-[360px] shrink-0 bg-white border-l border-sky-200 flex flex-col shadow-2xl">
        <div className="p-5 border-b border-sky-200 bg-sky-50">
          <h3 className="text-zinc-900 font-black uppercase tracking-widest text-xs">Answer Sheet</h3>
          <p className="text-zinc-500 text-[10px] font-black mt-1">{Object.keys(userAnswers).length}/{questions.length} answered</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-5 auto-rows-min gap-2">
          {questions.map((question, index) => {
            const id = question.id ?? index;
            const isCurrent = index === currentIndex;
            const hasAnswer = !!userAnswers[id];
            const isCorrect = showResult && userAnswers[id] === getCorrectOption(question);

            return (
              <button
                key={id}
                type="button"
                onClick={() => setCurrentIndex(index)}
                className={`h-11 rounded-xl text-xs font-black border transition-all ${
                  showResult && isCorrect ? 'bg-green-100 border-green-500 text-green-700' :
                  showResult && hasAnswer ? 'bg-red-100 border-red-500 text-red-700' :
                  isCurrent ? 'bg-blue-600 border-blue-500 text-white' :
                  hasAnswer ? 'bg-sky-100 border-sky-300 text-zinc-800' :
                  'bg-white border-sky-200 text-zinc-500'
                }`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>

        <div className="p-5 border-t border-sky-200 bg-sky-50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setCurrentIndex(current => Math.max(0, current - 1))}
              disabled={currentIndex === 0}
              className="py-3 rounded-xl bg-white border border-sky-200 text-zinc-700 disabled:text-zinc-300 font-black text-xs"
            >
              PREV
            </button>
            <button
              type="button"
              onClick={() => setCurrentIndex(current => Math.min(questions.length - 1, current + 1))}
              disabled={currentIndex === questions.length - 1}
              className="py-3 rounded-xl bg-white border border-sky-200 text-zinc-700 disabled:text-zinc-300 font-black text-xs"
            >
              NEXT
            </button>
          </div>
          {!showResult ? (
            <button
              type="button"
              onClick={calculateScore}
              className="w-full py-4 bg-sky-600 text-white font-black rounded-2xl hover:bg-sky-500 transition-all shadow-xl"
            >
              FINISH & SUBMIT
            </button>
          ) : (
            <button
              type="button"
              onClick={handleExit}
              className="w-full py-4 bg-sky-100 text-zinc-800 font-black rounded-2xl border border-sky-300 hover:bg-sky-200"
            >
              BACK TO LIST
            </button>
          )}
        </div>
      </aside>
    </div>
  );
};
