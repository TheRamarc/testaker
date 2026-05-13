import { useState } from "react";
import "./App.css";
import { PdfTestBuilder } from "./components/PdfTestBuilder";
import { TopicsManager } from "./components/TopicsManager";
import { HistoryDashboard } from "./components/HistoryDashboard";
import { PdfMaterialViewer } from "./components/PdfMaterialViewer";
import { PdfTestMode } from "./components/PdfTestMode";

type Tab = 'topics' | 'pdf-builder' | 'history';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('topics');

  const tabs: { id: Tab, label: string }[] = [
    { id: 'history', label: 'Recent History' },
    { id: 'topics', label: 'Topics' },
    { id: 'pdf-builder', label: 'Register Test' },
  ];

  const [activeMaterial, setActiveMaterial] = useState<any | null>(null);
  const [activeTestId, setActiveTestId] = useState<number | null>(null);

  if (activeMaterial) {
    return <PdfMaterialViewer material={activeMaterial} onClose={() => setActiveMaterial(null)} />;
  }

  if (activeTestId) {
    return <PdfTestMode testId={activeTestId} onExit={() => setActiveTestId(null)} />;
  }

  return (
    <main className="min-h-screen bg-sky-50 text-zinc-900 p-8 pb-24">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-black mb-4 tracking-tighter bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            TNPSC MASTER
          </h1>
          <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px]">Exam Intelligence Platform</p>
        </header>

        <div className="flex justify-center flex-wrap gap-2 mb-12">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                activeTab === tab.id
                  ? 'bg-sky-100 text-black border-black shadow-xl shadow-white/5 scale-105'
                  : 'bg-white text-zinc-600 hover:text-zinc-900 border-sky-200 hover:border-sky-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="animate-fade-in">
          {activeTab === 'history' && (
            <HistoryDashboard 
              onOpenMaterial={(mat) => setActiveMaterial(mat)}
              onOpenTest={(testId) => setActiveTestId(testId)}
            />
          )}
          {activeTab === 'topics' && (
            <TopicsManager 
              onOpenMaterial={(mat) => setActiveMaterial(mat)}
              onOpenTest={(testId) => setActiveTestId(testId)}
            />
          )}
          {activeTab === 'pdf-builder' && <PdfTestBuilder />}
        </div>
      </div>
    </main>
  );
}

export default App;
