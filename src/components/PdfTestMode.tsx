import React, { useState, useEffect } from 'react';
import { getPdfTestById, PdfTest, savePdfTestAttempt } from '../lib/db';
import { readFile } from '@tauri-apps/plugin-fs';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface PdfTestModeProps {
  testId: number;
  onExit?: () => void;
}

export const PdfTestMode: React.FC<PdfTestModeProps> = ({ testId, onExit }) => {
  const [selectedTest, setSelectedTest] = useState<PdfTest | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [answerSheetWidth, setAnswerSheetWidth] = useState(400);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [completedSeconds, setCompletedSeconds] = useState<number | null>(null);

  useEffect(() => {
    handleStartTest(testId);
  }, [testId]);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    if (selectedTest) {
      appWindow.setFullscreen(true).catch(console.error);
    } else {
      appWindow.setFullscreen(false).catch(console.error);
    }
    
    return () => {
      appWindow.setFullscreen(false).catch(console.error);
    };
  }, [selectedTest]);

  useEffect(() => {
    return () => {
      pageImages.forEach(src => {
        if (src.startsWith('blob:')) URL.revokeObjectURL(src);
      });
    };
  }, [pageImages]);

  useEffect(() => {
    if (!startedAt || showResult) return;

    const updateElapsed = () => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    };
    updateElapsed();
    const timerId = window.setInterval(updateElapsed, 1000);

    return () => window.clearInterval(timerId);
  }, [startedAt, showResult]);

  const renderPdfWithPdfJs = async (pdfPath: string) => {
    const [{ GlobalWorkerOptions, getDocument }, { default: pdfWorkerSrc }] = await Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs'),
      import('pdfjs-dist/legacy/build/pdf.worker.mjs?url')
    ]);

    GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

    const pdfBytes = await readFile(pdfPath);
    const pdf = await getDocument({ data: pdfBytes }).promise;
    const renderedPages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.6 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Could not create canvas context for PDF rendering');
      }

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      await page.render({ canvas, canvasContext: context, viewport }).promise;

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(result => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error('Could not render PDF page image'));
          }
        }, 'image/png');
      });

      renderedPages.push(URL.createObjectURL(blob));
    }

    return renderedPages;
  };

  const replacePageImages = (images: string[]) => {
    setPageImages(currentImages => {
      currentImages.forEach(src => {
        if (src.startsWith('blob:')) URL.revokeObjectURL(src);
      });
      return images;
    });
  };

  const handleStartTest = async (id: number) => {
    setLoadingPages(true);
    try {
      const test = await getPdfTestById(id);
      if (!test) return;
      if (!test.sourcePdfPath) {
        throw new Error('No source PDF is saved for this test. Please register this PDF again.');
      }

      const images = await renderPdfWithPdfJs(test.sourcePdfPath);
      replacePageImages(images);
      setSelectedTest(test);
      setUserAnswers({});
      setShowResult(false);
      setPdfZoom(100);
      setStartedAt(Date.now());
      setElapsedSeconds(0);
      setCompletedSeconds(null);
    } catch (error) {
      console.error('Failed to load PDF images:', error);
      alert('Failed to load test images: ' + error);
    } finally {
      setLoadingPages(false);
    }
  };

  const handleSelectOption = (qNum: number, opt: string) => {
    if (showResult) return;
    setUserAnswers(prev => ({ ...prev, [qNum]: opt }));
  };

  const adjustZoom = (amount: number) => {
    setPdfZoom(current => Math.min(180, Math.max(60, current + amount)));
  };

  const updateZoom = (value: number) => {
    setPdfZoom(Math.min(180, Math.max(60, value)));
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


  const startAnswerSheetResize = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = answerSheetWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const nextWidth = startWidth + startX - moveEvent.clientX;
      setAnswerSheetWidth(Math.min(560, Math.max(320, nextWidth)));
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const calculateScore = async () => {
    if (!selectedTest) return;
    let s = 0;
    selectedTest.answers.forEach(ans => {
      if (userAnswers[ans.questionNumber] === ans.correctOption) {
        s++;
      }
    });
    const finalSeconds = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : elapsedSeconds;
    setScore(s);
    setElapsedSeconds(finalSeconds);
    setCompletedSeconds(finalSeconds);
    setShowResult(true);

    if (selectedTest.id) {
      try {
        await savePdfTestAttempt({
          pdfTestId: selectedTest.id,
          score: s,
          totalQuestions: selectedTest.answers.length,
          durationSeconds: finalSeconds,
          attemptedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to save PDF test attempt:', error);
      }
    }
  };

  if (!selectedTest) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-zinc-500 font-black animate-pulse tracking-widest uppercase">
          {loadingPages ? 'Loading Test...' : 'Failed to load test'}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-sky-50 flex overflow-hidden border-t border-sky-200 z-50">
      {/* Left: PDF Viewer */}
      <div className="relative flex-1 min-w-0 bg-sky-50 border-r border-sky-200 overflow-hidden">
        <div className="absolute top-4 left-4 z-20 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-sky-200 text-zinc-900 text-xs font-black">
          {selectedTest.name} • {pageImages.length} Pages
        </div>

        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-white/80 backdrop-blur-md p-1 rounded-full border border-sky-200">
          <button
            type="button"
            onClick={() => adjustZoom(-2)}
            className="w-8 h-8 rounded-full text-zinc-900 bg-black/5 hover:bg-black/10 text-lg leading-none font-black"
            title="Zoom out"
          >
            -
          </button>
          <input
            type="number"
            min="60"
            max="180"
            step="2"
            value={pdfZoom}
            onChange={(e) => updateZoom(Number(e.target.value) || 100)}
            className="w-16 h-8 rounded-full bg-white text-zinc-900 text-center text-[11px] font-black outline-none border border-sky-200 focus:border-blue-500"
            title="Zoom percentage"
          />
          <button
            type="button"
            onClick={() => adjustZoom(2)}
            className="w-8 h-8 rounded-full text-zinc-900 bg-black/5 hover:bg-black/10 text-lg leading-none font-black"
            title="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setPdfZoom(100)}
            className="h-8 px-3 rounded-full text-zinc-900 bg-black/5 hover:bg-black/10 text-[11px] font-black"
            title="Reset zoom"
          >
            100%
          </button>
        </div>

        <div className="h-full overflow-auto p-8 pt-20 custom-scrollbar">
          <div
            className="mx-auto space-y-8"
            style={{
              width: `${pdfZoom}%`,
              maxWidth: pdfZoom <= 100 ? '56rem' : 'none',
              minWidth: pdfZoom >= 100 ? '56rem' : '32rem'
            }}
          >
            {pageImages.map((src, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow-2xl overflow-hidden relative">
                <img 
                  src={src} 
                  alt={`Page ${idx + 1}`} 
                  className="w-full h-auto block"
                  loading="lazy"
                  onError={(e) => {
                    console.error('PDF Page failed to load:', src, 'URL:', e.currentTarget.src);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Answer Sheet */}
      <div
        className="shrink-0 flex flex-col bg-white shadow-2xl relative"
        style={{ width: answerSheetWidth }}
      >
        <div
          onMouseDown={startAnswerSheetResize}
          className="absolute left-0 top-0 h-full w-2 -translate-x-1 cursor-col-resize z-30 group"
          title="Resize answer sheet"
        >
          <div className="h-full w-px mx-auto bg-sky-200 group-hover:bg-blue-500 transition-colors" />
        </div>
        <div className="p-6 border-b border-sky-200 flex justify-between items-center bg-sky-50/80 backdrop-blur-md">
          <div>
            <h3 className="text-zinc-900 font-black uppercase tracking-widest text-xs">Answer Sheet</h3>
            <p className="text-zinc-500 text-[10px] font-black mt-1">Time {formatDuration(completedSeconds ?? elapsedSeconds)}</p>
          </div>
          <button 
            onClick={() => {
              setSelectedTest(null);
              if (onExit) onExit();
            }}
            className="text-white bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded-lg text-xs font-black transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] border border-red-500"
          >
            EXIT TEST
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {selectedTest.answers.map(ans => {
            const qNum = ans.questionNumber;
            const isSelected = userAnswers[qNum];
            const isCorrect = showResult && isSelected === ans.correctOption;
            const isWrong = showResult && isSelected && isSelected !== ans.correctOption;

            return (
              <div key={qNum} className={`p-4 rounded-2xl border transition-all ${
                isCorrect ? 'bg-green-500/10 border-green-500/50' :
                isWrong ? 'bg-red-500/10 border-red-500/50' :
                'bg-sky-50 border-sky-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-black ${isSelected ? 'text-white' : 'text-zinc-600'}`}>Q{qNum}</span>
                  {showResult && (
                    <span className="text-[10px] font-black uppercase">
                      {isCorrect ? '✓ Correct' : isWrong ? `✗ Correct: ${ans.correctOption}` : 'Missed'}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {['A', 'B', 'C', 'D', 'E'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => handleSelectOption(qNum, opt)}
                      disabled={showResult}
                      className={`w-10 h-10 rounded-xl text-xs font-black border transition-all ${
                        userAnswers[qNum] === opt 
                        ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20' 
                        : 'border-sky-200 text-zinc-600 hover:border-sky-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-6 border-t border-sky-200 bg-sky-50">
          {!showResult ? (
            <button
              onClick={calculateScore}
              className="w-full py-4 bg-sky-600 text-white font-black rounded-2xl hover:bg-sky-500 transition-all shadow-xl"
            >
              FINISH & SUBMIT
            </button>
          ) : (
            <div className="text-center">
              <p className="text-zinc-500 text-xs font-black uppercase mb-1">Final Score</p>
              <h2 className="text-4xl font-black text-zinc-900">{score} <span className="text-zinc-600 text-lg">/ {selectedTest.answers.length}</span></h2>
              <p className="mt-2 text-zinc-500 text-xs font-black uppercase">Time Taken: {formatDuration(completedSeconds ?? elapsedSeconds)}</p>
              <button
                onClick={() => {
                  setSelectedTest(null);
                  if (onExit) onExit();
                }}
                className="mt-6 w-full py-3 bg-sky-100 text-zinc-800 font-bold rounded-xl border border-sky-300 hover:bg-sky-200 transition-colors"
              >
                BACK TO LIST
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
