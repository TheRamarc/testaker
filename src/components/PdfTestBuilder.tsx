import React, { useState, useEffect } from 'react';
import { pickAndSaveImages, pickAndSavePdf } from '../lib/storage';
import { getAllTopics, createTopic, Topic, savePdfTest, savePdfMaterial, PdfAnswer, saveTextTest } from '../lib/db';
import { createImageObjectUrl, revokeObjectUrls } from '../lib/filePreview';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'];

type UploadMode = 'pdf_test' | 'photo_test' | 'text_test' | 'material';

interface PhotoQuestionDraft {
  imagePath: string;
  originalName: string;
  answer: string | null;
}

const PhotoQuestionPreview: React.FC<{ imagePath: string; label: string }> = ({ imagePath, label }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;

    createImageObjectUrl(imagePath)
      .then(url => {
        objectUrl = url;
        if (isMounted) {
          setPreviewUrl(url);
        } else {
          revokeObjectUrls([url]);
        }
      })
      .catch(error => {
        console.error('Failed to load photo preview:', error);
      });

    return () => {
      isMounted = false;
      if (objectUrl) revokeObjectUrls([objectUrl]);
    };
  }, [imagePath]);

  if (!previewUrl) {
    return (
      <div className="w-20 h-20 rounded-xl bg-white border border-sky-200 flex items-center justify-center text-[10px] font-black text-zinc-400">
        IMG
      </div>
    );
  }

  return (
    <img
      src={previewUrl}
      alt={label}
      className="w-20 h-20 rounded-xl object-cover border border-sky-200 bg-white"
    />
  );
};

export const PdfTestBuilder: React.FC = () => {
  const [uploadMode, setUploadMode] = useState<UploadMode>('pdf_test');
  const [name, setName] = useState('');
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [topicId, setTopicId] = useState<number | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [newTopicName, setNewTopicName] = useState('');
  const [showNewTopicInput, setShowNewTopicInput] = useState(false);
  const [numQuestions, setNumQuestions] = useState(10);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [photoQuestions, setPhotoQuestions] = useState<PhotoQuestionDraft[]>([]);

  // Text Test state
  const [textQuestions, setTextQuestions] = useState<{ text: string, options: { text: string, isCorrect: boolean }[] }[]>([
    { text: '', options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }] }
  ]);

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      const allTopics = await getAllTopics();
      setTopics(allTopics);
    } catch (error) {
      console.error('Failed to fetch topics:', error);
    }
  };

  const handlePickPdf = async () => {
    const pdf = await pickAndSavePdf();
    if (pdf) {
      setPdfPath(pdf.savedPath);
      if (!name) {
        const baseName = pdf.originalName.replace(/\.pdf$/i, '');
        setName(baseName || 'New PDF Test');
      }
    }
  };

  const handlePickImages = async () => {
    const images = await pickAndSaveImages();
    if (images.length === 0) return;

    setPhotoQuestions(prev => [
      ...prev,
      ...images.map(image => ({
        imagePath: image.savedPath,
        originalName: image.originalName,
        answer: null
      }))
    ]);

    if (!name && images.length === 1) {
      setName(images[0].originalName.replace(/\.(png|jpe?g|webp)$/i, '') || 'Photo Test');
    } else if (!name) {
      setName('Photo Test');
    }
  };

  const handleAnswerChange = (qNum: number, option: string) => {
    setAnswers(prev => ({ ...prev, [qNum]: option }));
  };

  const handlePhotoAnswerChange = (index: number, option: string) => {
    setPhotoQuestions(prev => prev.map((question, qIndex) => (
      qIndex === index ? { ...question, answer: option } : question
    )));
  };

  const handleRemovePhotoQuestion = (index: number) => {
    setPhotoQuestions(prev => prev.filter((_, qIndex) => qIndex !== index));
  };

  const handleCreateTopic = async () => {
    if (!newTopicName.trim()) return;
    try {
      const id = await createTopic(newTopicName.trim());
      await fetchTopics();
      setTopicId(Number(id));
      setNewTopicName('');
      setShowNewTopicInput(false);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create topic' });
    }
  };

  // Text Question handlers
  const handleAddTextQuestion = () => {
    setTextQuestions(prev => [...prev, { text: '', options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }] }]);
  };

  const handleRemoveTextQuestion = (index: number) => {
    setTextQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleTextQuestionChange = (index: number, text: string) => {
    const newQs = [...textQuestions];
    newQs[index].text = text;
    setTextQuestions(newQs);
  };

  const handleTextOptionChange = (qIndex: number, oIndex: number, text: string) => {
    const newQs = [...textQuestions];
    newQs[qIndex].options[oIndex].text = text;
    setTextQuestions(newQs);
  };

  const handleTextOptionCorrectChange = (qIndex: number, oIndex: number) => {
    const newQs = [...textQuestions];
    newQs[qIndex].options.forEach((o, i) => {
      o.isCorrect = (i === oIndex);
    });
    setTextQuestions(newQs);
  };

  const handleAddTextOption = (qIndex: number) => {
    const newQs = [...textQuestions];
    newQs[qIndex].options.push({ text: '', isCorrect: false });
    setTextQuestions(newQs);
  };

  const handleRemoveTextOption = (qIndex: number, oIndex: number) => {
    const newQs = [...textQuestions];
    if (newQs[qIndex].options.length > 2) {
      newQs[qIndex].options.splice(oIndex, 1);
      if (!newQs[qIndex].options.some(o => o.isCorrect)) {
        newQs[qIndex].options[0].isCorrect = true;
      }
      setTextQuestions(newQs);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !topicId) {
      setMessage({ type: 'error', text: 'Please fill name and topic fields' });
      return;
    }
    if ((uploadMode === 'pdf_test' || uploadMode === 'material') && !pdfPath) {
      setMessage({ type: 'error', text: 'Please upload a PDF document' });
      return;
    }

    const registeredAnswers: PdfAnswer[] = [];
    if (uploadMode === 'pdf_test') {
      for (let i = 1; i <= numQuestions; i++) {
        if (!answers[i]) {
          setMessage({ type: 'error', text: `Please provide an answer for Question ${i}` });
          return;
        }
        registeredAnswers.push({
          questionNumber: i,
          correctOption: answers[i]
        });
      }
    } else if (uploadMode === 'photo_test') {
      if (photoQuestions.length === 0) {
        setMessage({ type: 'error', text: 'Please upload at least one question photo' });
        return;
      }
      for (let i = 0; i < photoQuestions.length; i++) {
        if (!photoQuestions[i].answer) {
          setMessage({ type: 'error', text: `Please choose an answer for Photo Question ${i + 1}` });
          return;
        }
      }
    } else if (uploadMode === 'text_test') {
      if (textQuestions.length === 0) {
        setMessage({ type: 'error', text: 'Please add at least one question' });
        return;
      }
      for (let i = 0; i < textQuestions.length; i++) {
        const q = textQuestions[i];
        if (!q.text.trim()) {
          setMessage({ type: 'error', text: `Question ${i + 1} text cannot be empty` });
          return;
        }
        for (let j = 0; j < q.options.length; j++) {
          if (!q.options[j].text.trim()) {
            setMessage({ type: 'error', text: `Question ${i + 1}, Option ${j + 1} cannot be empty` });
            return;
          }
        }
      }
    }

    setLoading(true);
    setMessage({ type: 'info', text: 'Processing...' });
    
    try {
      if (uploadMode === 'pdf_test') {
        await savePdfTest({
          name,
          pdfPath: '',
          sourcePdfPath: pdfPath!,
          topicId,
          answers: registeredAnswers
        });
        setMessage({ type: 'success', text: 'PDF Test registered successfully!' });
      } else if (uploadMode === 'text_test') {
        await saveTextTest({
          name,
          topicId,
          questions: textQuestions.map(q => ({
            text: q.text,
            imagePath: null,
            topicId,
            options: q.options.map(o => ({
              text: o.text,
              isCorrect: o.isCorrect
            }))
          }))
        });
        setMessage({ type: 'success', text: 'Text Test created successfully!' });
        setTextQuestions([{ text: '', options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }] }]);
      } else if (uploadMode === 'photo_test') {
        await saveTextTest({
          name,
          topicId,
          questions: photoQuestions.map((question, index) => ({
            text: `Photo Question ${index + 1}`,
            imagePath: question.imagePath,
            topicId,
            options: OPTION_LABELS.map(option => ({
              text: option,
              isCorrect: option === question.answer
            }))
          }))
        });
        setMessage({ type: 'success', text: 'Photo Test created successfully!' });
        setPhotoQuestions([]);
      } else {
        await savePdfMaterial({
          name,
          pdfPath: '',
          sourcePdfPath: pdfPath!,
          topicId
        });
        setMessage({ type: 'success', text: 'Study Material registered successfully!' });
      }

      setName('');
      setPdfPath(null);
      setAnswers({});
    } catch (error) {
      console.error('Conversion/Save failed:', error);
      setMessage({ type: 'error', text: 'Failed to process: ' + error });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto p-8 bg-white border border-sky-200 rounded-2xl shadow-xl">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Resource Builder</h2>
        <div className="flex bg-sky-50 rounded-xl p-1 border border-sky-200">
          <button
            type="button"
            onClick={() => setUploadMode('pdf_test')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${uploadMode === 'pdf_test' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            PDF Test
          </button>
          <button
            type="button"
            onClick={() => setUploadMode('text_test')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${uploadMode === 'text_test' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            Text Test
          </button>
          <button
            type="button"
            onClick={() => setUploadMode('photo_test')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${uploadMode === 'photo_test' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            Photo Test
          </button>
          <button
            type="button"
            onClick={() => setUploadMode('material')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${uploadMode === 'material' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            Study Material
          </button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 bg-white border border-sky-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. History Unit 1"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Topic</label>
            <div className="flex gap-2">
              {!showNewTopicInput ? (
                <>
                  <select
                    value={topicId || ''}
                    onChange={(e) => setTopicId(e.target.value ? Number(e.target.value) : null)}
                    className="flex-1 p-3 bg-white border border-sky-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Select Topic</option>
                    {topics.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setShowNewTopicInput(true)} className="px-4 py-2 bg-sky-100 text-zinc-800 rounded-xl border border-sky-300 hover:bg-sky-200">New</button>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                    className="flex-1 p-3 bg-white border border-sky-200 rounded-xl text-zinc-900 outline-none"
                    placeholder="Topic Name"
                  />
                  <button type="button" onClick={handleCreateTopic} className="px-4 py-2 bg-blue-600 text-white rounded-xl">Add</button>
                  <button type="button" onClick={() => setShowNewTopicInput(false)} className="px-4 py-2 bg-sky-100 text-zinc-800 rounded-xl">X</button>
                </>
              )}
            </div>
          </div>

          {(uploadMode === 'pdf_test' || uploadMode === 'material') && (
            <div>
              <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">PDF Document</label>
              <button
                type="button"
                onClick={handlePickPdf}
                className={`w-full p-4 border-2 border-dashed rounded-2xl transition-all ${pdfPath ? 'border-green-500/50 bg-green-500/5 text-green-400' : 'border-sky-300 hover:border-sky-400 bg-white text-zinc-600'}`}
              >
                {pdfPath ? '✓ PDF Uploaded' : 'Click to Upload PDF'}
              </button>
              {pdfPath && <p className="mt-2 text-[10px] text-zinc-600 truncate">{pdfPath}</p>}
            </div>
          )}

          {uploadMode === 'photo_test' && (
            <div>
              <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Question Photos</label>
              <button
                type="button"
                onClick={handlePickImages}
                className="w-full p-4 border-2 border-dashed rounded-2xl transition-all border-sky-300 hover:border-sky-400 bg-white text-zinc-600"
              >
                {photoQuestions.length > 0 ? `Add More Photos (${photoQuestions.length} selected)` : 'Upload Question Photos'}
              </button>
            </div>
          )}

          {uploadMode === 'pdf_test' && (
            <div>
              <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Number of Questions</label>
              <input
                type="number"
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                className="w-full p-3 bg-white border border-sky-200 rounded-xl text-zinc-900 outline-none"
                min="1"
                max="200"
              />
            </div>
          )}

          {message && (
            <div className={`p-4 rounded-xl text-sm font-bold ${
              message.type === 'success' ? 'bg-green-900/20 text-green-700 border border-green-300' : 
              message.type === 'info' ? 'bg-blue-900/20 text-blue-700 border border-blue-300' :
              'bg-red-900/20 text-red-700 border border-red-300'
            }`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-sky-100 disabled:text-zinc-500 text-white font-black rounded-xl transition-all shadow-xl shadow-blue-500/10 uppercase tracking-widest"
          >
            {loading ? 'Processing...' : (
              uploadMode === 'pdf_test' ? 'Register PDF Test' :
              uploadMode === 'photo_test' ? 'Create Photo Test' :
              uploadMode === 'text_test' ? 'Create Text Test' : 'Save Material'
            )}
          </button>
        </div>

        {uploadMode === 'pdf_test' && (
          <div className="space-y-4">
            <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Register Answer Key</label>
            <div className="bg-white border border-sky-200 rounded-2xl p-6 h-[500px] overflow-y-auto space-y-4">
              {Array.from({ length: numQuestions }).map((_, idx) => {
                const qNum = idx + 1;
                return (
                  <div key={qNum} className="flex items-center justify-between p-3 bg-sky-50 border border-sky-200 rounded-xl">
                    <span className="text-zinc-500 font-black text-xs">Q{qNum}</span>
                    <div className="flex gap-2">
                      {OPTION_LABELS.map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleAnswerChange(qNum, opt)}
                          className={`w-8 h-8 rounded-lg text-xs font-black border transition-all ${answers[qNum] === opt ? 'bg-blue-600 border-blue-500 text-white' : 'border-sky-200 text-zinc-500 hover:border-sky-300'}`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {uploadMode === 'photo_test' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest">Photo Answer Key</label>
              <button
                type="button"
                onClick={handlePickImages}
                className="px-3 py-1 bg-sky-100 text-blue-600 text-[10px] font-black rounded-lg uppercase tracking-wider hover:bg-sky-200"
              >
                + Add Photos
              </button>
            </div>

            <div className="bg-white border border-sky-200 rounded-2xl p-6 h-[500px] overflow-y-auto space-y-4">
              {photoQuestions.length === 0 ? (
                <div className="text-center text-zinc-400 py-10 font-bold">No photos uploaded yet.</div>
              ) : (
                photoQuestions.map((question, qIdx) => (
                  <div key={`${question.imagePath}-${qIdx}`} className="p-4 bg-sky-50 border border-sky-200 rounded-xl space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <PhotoQuestionPreview imagePath={question.imagePath} label={`Question ${qIdx + 1}`} />
                        <div className="min-w-0 pt-1">
                          <div className="text-blue-600 font-black text-sm">Q{qIdx + 1}</div>
                          <div className="text-zinc-900 text-sm font-bold truncate">{question.originalName}</div>
                          <div className="text-zinc-500 text-[10px] truncate">{question.imagePath}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePhotoQuestion(qIdx)}
                        className="text-red-500 hover:text-red-700 font-black text-lg px-2"
                        title="Remove Photo"
                      >
                        ×
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-zinc-500 font-black text-[10px] uppercase tracking-widest">Correct Answer</span>
                      <div className="flex gap-2">
                        {OPTION_LABELS.map(opt => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handlePhotoAnswerChange(qIdx, opt)}
                            className={`w-8 h-8 rounded-lg text-xs font-black border transition-all ${question.answer === opt ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white border-sky-200 text-zinc-500 hover:border-sky-300'}`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {uploadMode === 'text_test' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest">Questions Builder</label>
              <button
                type="button"
                onClick={handleAddTextQuestion}
                className="px-3 py-1 bg-sky-100 text-blue-600 text-[10px] font-black rounded-lg uppercase tracking-wider hover:bg-sky-200"
              >
                + Add Question
              </button>
            </div>
            
            <div className="bg-white border border-sky-200 rounded-2xl p-6 h-[500px] overflow-y-auto space-y-6">
              {textQuestions.map((q, qIdx) => (
                <div key={qIdx} className="p-4 bg-sky-50 border border-sky-200 rounded-xl space-y-4 relative">
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-blue-600 font-black text-sm mt-2">Q{qIdx + 1}</span>
                    <textarea
                      value={q.text}
                      onChange={(e) => handleTextQuestionChange(qIdx, e.target.value)}
                      placeholder="Type question here..."
                      className="flex-1 p-3 bg-white border border-sky-200 rounded-xl text-sm text-zinc-900 outline-none focus:border-blue-500 min-h-[80px]"
                    />
                    {textQuestions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTextQuestion(qIdx)}
                        className="text-red-500 hover:text-red-700 font-black text-lg px-2"
                        title="Remove Question"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  
                  <div className="pl-8 space-y-2">
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-3">
                        <input
                          type="radio"
                          name={`q-${qIdx}-correct`}
                          checked={opt.isCorrect}
                          onChange={() => handleTextOptionCorrectChange(qIdx, oIdx)}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => handleTextOptionChange(qIdx, oIdx, e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                          className={`flex-1 p-2 text-sm bg-white border rounded-lg outline-none focus:border-blue-500 ${opt.isCorrect ? 'border-blue-400 bg-blue-50' : 'border-sky-200'}`}
                        />
                        {q.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTextOption(qIdx, oIdx)}
                            className="text-zinc-400 hover:text-red-500 px-2"
                            title="Remove Option"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    {q.options.length < 6 && (
                      <button
                        type="button"
                        onClick={() => handleAddTextOption(qIdx)}
                        className="text-xs text-blue-500 font-bold hover:text-blue-700 mt-2"
                      >
                        + Add Option
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {textQuestions.length === 0 && (
                <div className="text-center text-zinc-400 py-10 font-bold">No questions added yet.</div>
              )}
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
