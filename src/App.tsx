import { useState } from "react";
import "./App.css";
import { PdfTestBuilder } from "./components/PdfTestBuilder";
import { PdfTestMode } from "./components/PdfTestMode";

type Tab = 'pdf-builder' | 'pdf-test';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('pdf-builder');

  const tabs: { id: Tab, label: string }[] = [
    { id: 'pdf-builder', label: 'Setup PDF Test' },
    { id: 'pdf-test', label: 'Live PDF Test' },
  ];

  return (
    <main className="min-h-screen bg-black text-zinc-100 p-8 pb-24">
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
                  ? 'bg-white text-black border-white shadow-xl shadow-white/5 scale-105'
                  : 'bg-zinc-900 text-zinc-500 hover:text-white border-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="animate-fade-in">
          {activeTab === 'pdf-builder' && <PdfTestBuilder />}
          {activeTab === 'pdf-test' && <PdfTestMode />}
        </div>
      </div>
    </main>
  );
}

export default App;
