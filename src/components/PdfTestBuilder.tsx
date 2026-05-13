import React, { useState, useEffect } from 'react';
import { pickAndSavePdf } from '../lib/storage';
import { getAllTopics, createTopic, Topic, savePdfTest, savePdfMaterial, PdfAnswer } from '../lib/db';

export const PdfTestBuilder: React.FC = () => {
  const [uploadMode, setUploadMode] = useState<'test' | 'material'>('test');
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
    const path = await pickAndSavePdf();
    if (path) {
      setPdfPath(path);
      if (!name) {
        const baseName = path.split(/[/\\]/).pop()?.replace(/pdf_\d+_/, '').replace('.pdf', '');
        setName(baseName || 'New PDF Test');
      }
    }
  };

  const handleAnswerChange = (qNum: number, option: string) => {
    setAnswers(prev => ({ ...prev, [qNum]: option }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfPath || !name.trim() || !topicId) {
      setMessage({ type: 'error', text: 'Please fill all fields' });
      return;
    }

    const registeredAnswers: PdfAnswer[] = [];
    if (uploadMode === 'test') {
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
    }

    setLoading(true);
    setMessage({ type: 'info', text: 'Processing...' });
    
    try {
      if (uploadMode === 'test') {
        await savePdfTest({
          name,
          pdfPath: '',
          sourcePdfPath: pdfPath,
          topicId,
          answers: registeredAnswers
        });
        setMessage({ type: 'success', text: 'PDF Test registered successfully!' });
      } else {
        await savePdfMaterial({
          name,
          pdfPath: '',
          sourcePdfPath: pdfPath,
          topicId
        });
        setMessage({ type: 'success', text: 'Study Material registered successfully!' });
      }

      setName('');
      setPdfPath(null);
      setAnswers({});
    } catch (error) {
      console.error('Conversion/Save failed:', error);
      setMessage({ type: 'error', text: 'Failed to process PDF: ' + error });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white border border-sky-200 rounded-2xl shadow-xl">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Upload PDF Document</h2>
        <div className="flex bg-sky-50 rounded-xl p-1 border border-sky-200">
          <button
            onClick={() => setUploadMode('test')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${uploadMode === 'test' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            Create PDF Test
          </button>
          <button
            onClick={() => setUploadMode('material')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${uploadMode === 'material' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            Create Study Material
          </button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Test Name</label>
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

          {uploadMode === 'test' && (
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
              message.type === 'success' ? 'bg-green-900/20 text-green-400 border border-green-800' : 
              message.type === 'info' ? 'bg-blue-900/20 text-blue-400 border border-blue-800' :
              'bg-red-900/20 text-red-400 border border-red-800'
            }`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-sky-100 disabled:text-zinc-500 text-white font-black rounded-xl transition-all shadow-xl shadow-blue-500/10 uppercase tracking-widest"
          >
            {loading ? 'Processing...' : (uploadMode === 'test' ? 'Register Test' : 'Save Material')}
          </button>
        </div>

        {uploadMode === 'test' && (
          <div className="space-y-4">
          <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Register Answer Key</label>
          <div className="bg-white border border-sky-200 rounded-2xl p-6 h-[500px] overflow-y-auto space-y-4">
            {Array.from({ length: numQuestions }).map((_, idx) => {
              const qNum = idx + 1;
              return (
                <div key={qNum} className="flex items-center justify-between p-3 bg-sky-50 border border-sky-200 rounded-xl">
                  <span className="text-zinc-500 font-black text-xs">Q{qNum}</span>
                  <div className="flex gap-2">
                    {['A', 'B', 'C', 'D', 'E'].map(opt => (
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
      </form>
    </div>
  );
};
