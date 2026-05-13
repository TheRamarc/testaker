import React, { useEffect, useState } from 'react';
import { getRecentMaterials, getRecentTestAttempts, PdfMaterial, RecentTestAttempt } from '../lib/db';
interface HistoryDashboardProps {
  onOpenMaterial?: (mat: PdfMaterial) => void;
  onOpenTest?: (testId: number) => void;
}

export const HistoryDashboard: React.FC<HistoryDashboardProps> = ({ onOpenMaterial, onOpenTest }) => {
  const [materials, setMaterials] = useState<PdfMaterial[]>([]);
  const [tests, setTests] = useState<RecentTestAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const [recentMats, recentTests] = await Promise.all([
        getRecentMaterials(5),
        getRecentTestAttempts(5)
      ]);
      setMaterials(recentMats);
      setTests(recentTests);
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(dateStr));
  };

  if (loading) {
    return <div className="text-center text-zinc-500 py-12 animate-pulse font-black uppercase tracking-widest">Loading History...</div>;
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-12">
      <section>
        <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tight mb-6 flex items-center gap-3">
          <span className="w-2 h-8 bg-blue-500 rounded-full inline-block"></span>
          Recent Tests
        </h2>
        {tests.length === 0 ? (
          <div className="p-8 border border-sky-200 rounded-2xl bg-sky-50 text-center text-zinc-500 font-bold">
            No tests taken yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tests.map(t => (
              <button 
                key={t.id} 
                onClick={() => onOpenTest && t.pdfTestId && onOpenTest(t.pdfTestId)}
                className="p-5 text-left bg-white hover:bg-sky-100 transition-all border border-sky-200 rounded-2xl flex flex-col gap-2 group"
              >
                <h3 className="text-zinc-900 font-bold text-lg truncate group-hover:text-sky-600">{t.testName}</h3>
                <div className="flex justify-between items-center mt-2 w-full">
                  <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-md text-[10px] font-black uppercase tracking-wider">
                    Score: {t.score}/{t.totalQuestions}
                  </span>
                  <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">
                    {formatDate(t.attemptedAt)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tight mb-6 flex items-center gap-3">
          <span className="w-2 h-8 bg-indigo-500 rounded-full inline-block"></span>
          Recent Materials
        </h2>
        {materials.length === 0 ? (
          <div className="p-8 border border-sky-200 rounded-2xl bg-sky-50 text-center text-zinc-500 font-bold">
            No materials opened yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.map(m => (
              <button 
                key={m.id} 
                onClick={() => onOpenMaterial && onOpenMaterial(m)}
                className="p-5 text-left bg-white hover:bg-sky-100 transition-all border border-sky-200 rounded-2xl flex flex-col gap-2 group"
              >
                <h3 className="text-zinc-900 font-bold text-lg truncate group-hover:text-sky-600">{m.name}</h3>
                <div className="flex justify-between items-center mt-2 w-full">
                  <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded-md text-[10px] font-black uppercase tracking-wider">
                    Material
                  </span>
                  <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">
                    {m.last_opened_at ? formatDate(m.last_opened_at) : 'Unknown'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
