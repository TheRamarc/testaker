import React, { useState, useEffect } from 'react';
import { getAllTopics, Topic, getPdfMaterialsByTopic, getPdfTestsByTopic, PdfMaterial, markPdfMaterialOpened, getAllPdfMaterials, getAllPdfTests, deletePdfMaterial, deletePdfTest, deleteTopic, updateTopicName, updatePdfMaterialName, updatePdfTestName, TextTest, getTextTestsByTopic, getAllTextTests, deleteTextTest, updateTextTestName } from '../lib/db';
import { PdfTest } from '../lib/db';
import { ConfirmDialog } from './ConfirmDialog';
import { EditNameDialog } from './EditNameDialog';
import { createImageObjectUrl, revokeObjectUrls } from '../lib/filePreview';

type AppTest = (PdfTest & { type: 'pdf' }) | (TextTest & { type: 'text' });

const TestImageThumbnail: React.FC<{ imagePath: string; label: string }> = ({ imagePath, label }) => {
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
        console.error('Failed to load test thumbnail:', error);
      });

    return () => {
      isMounted = false;
      if (objectUrl) revokeObjectUrls([objectUrl]);
    };
  }, [imagePath]);

  if (!previewUrl) {
    return (
      <div className="w-16 h-16 shrink-0 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-[9px] font-black text-zinc-400">
        IMG
      </div>
    );
  }

  return (
    <img
      src={previewUrl}
      alt={label}
      className="w-16 h-16 shrink-0 rounded-xl object-cover border border-sky-200 bg-white"
    />
  );
};

function getTestPreviewImage(test: AppTest) {
  return test.type === 'text' ? test.previewImagePath : null;
}

interface ItemActionsProps {
  onEdit: (event: React.MouseEvent) => void;
  onDelete: (event: React.MouseEvent) => void;
}

const ItemActions: React.FC<ItemActionsProps> = ({ onEdit, onDelete }) => (
  <div className="flex items-center gap-1.5">
    <button
      type="button"
      onClick={onEdit}
      className="h-8 px-2.5 rounded-lg border border-sky-200 bg-white/90 text-zinc-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 text-[10px] font-black uppercase tracking-wider transition-colors shadow-sm"
      title="Rename"
    >
      Edit
    </button>
    <button
      type="button"
      onClick={onDelete}
      className="h-8 px-2.5 rounded-lg border border-red-200 bg-white/90 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-200 text-[10px] font-black uppercase tracking-wider transition-colors shadow-sm"
      title="Delete"
    >
      Delete
    </button>
  </div>
);

interface TopicsManagerProps {
  onOpenMaterial?: (mat: PdfMaterial) => void;
  onOpenTest?: (testId: number, testType: 'pdf' | 'text') => void;
}

export const TopicsManager: React.FC<TopicsManagerProps> = ({ onOpenMaterial, onOpenTest }) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  
  const [materials, setMaterials] = useState<PdfMaterial[]>([]);
  const [tests, setTests] = useState<AppTest[]>([]);
  
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [allMaterials, setAllMaterials] = useState<PdfMaterial[]>([]);
  const [allTests, setAllTests] = useState<AppTest[]>([]);

  // Confirm-dialog state
  type PendingDelete =
    | { type: 'topic'; id: number; name: string }
    | { type: 'material'; id: number; name: string }
    | { type: 'test'; id: number; name: string; testType: 'pdf' | 'text' }
    | null;
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);

  // Edit-dialog state
  type PendingEdit =
    | { type: 'topic'; id: number; name: string }
    | { type: 'material'; id: number; name: string }
    | { type: 'test'; id: number; name: string; testType: 'pdf' | 'text' }
    | null;
  const [pendingEdit, setPendingEdit] = useState<PendingEdit>(null);

  useEffect(() => {
    fetchTopics();
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [mats, ptsts, ttsts] = await Promise.all([
        getAllPdfMaterials(),
        getAllPdfTests(),
        getAllTextTests()
      ]);
      setAllMaterials(mats);
      setAllTests([
        ...ptsts.map(t => ({ ...t, type: 'pdf' as const })),
        ...ttsts.map(t => ({ ...t, type: 'text' as const }))
      ]);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (selectedTopic) {
      fetchTopicData(selectedTopic.id);
    }
  }, [selectedTopic]);

  const fetchTopics = async () => {
    try {
      const allTopics = await getAllTopics();
      setTopics(allTopics);
    } catch (error) {
      console.error('Failed to fetch topics:', error);
    }
  };

  const fetchTopicData = async (topicId: number) => {
    setLoading(true);
    try {
      const [mats, ptsts, ttsts] = await Promise.all([
        getPdfMaterialsByTopic(topicId),
        getPdfTestsByTopic(topicId),
        getTextTestsByTopic(topicId)
      ]);
      setMaterials(mats);
      setTests([
        ...ptsts.map(t => ({ ...t, type: 'pdf' as const })),
        ...ttsts.map(t => ({ ...t, type: 'text' as const }))
      ]);
    } catch (error) {
      console.error('Failed to fetch topic data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMaterial = async (mat: PdfMaterial) => {
    if (onOpenMaterial) onOpenMaterial(mat);
    if (mat.id) {
      try {
        await markPdfMaterialOpened(mat.id);
        if (selectedTopic) fetchTopicData(selectedTopic.id);
      } catch (e) {
        console.error("Failed to mark material as opened:", e);
      }
    }
  };

  const handleDeleteMaterial = (e: React.MouseEvent, id: number, name: string) => {
    e.stopPropagation();
    setPendingDelete({ type: 'material', id, name });
  };

  const handleDeleteTest = (e: React.MouseEvent, id: number, name: string, testType: 'pdf' | 'text') => {
    e.stopPropagation();
    setPendingDelete({ type: 'test', id, name, testType });
  };

  const handleDeleteTopic = (e: React.MouseEvent, id: number, name: string) => {
    e.stopPropagation();
    setPendingDelete({ type: 'topic', id, name });
  };

  const executeDelete = async () => {
    if (!pendingDelete) return;
    try {
      if (pendingDelete.type === 'material') {
        await deletePdfMaterial(pendingDelete.id);
        if (selectedTopic) fetchTopicData(selectedTopic.id);
        fetchAllData();
      } else if (pendingDelete.type === 'test') {
        if (pendingDelete.testType === 'pdf') {
          await deletePdfTest(pendingDelete.id);
        } else {
          await deleteTextTest(pendingDelete.id);
        }
        if (selectedTopic) fetchTopicData(selectedTopic.id);
        fetchAllData();
      } else if (pendingDelete.type === 'topic') {
        await deleteTopic(pendingDelete.id);
        if (selectedTopic?.id === pendingDelete.id) {
          setSelectedTopic(null);
          setMaterials([]);
          setTests([]);
        }
        fetchTopics();
        fetchAllData();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setPendingDelete(null);
    }
  };

  const executeEdit = async (newName: string) => {
    if (!pendingEdit) return;
    try {
      if (pendingEdit.type === 'topic') {
        await updateTopicName(pendingEdit.id, newName);
        fetchTopics();
        if (selectedTopic?.id === pendingEdit.id) {
          setSelectedTopic(prev => prev ? { ...prev, name: newName } : null);
        }
      } else if (pendingEdit.type === 'material') {
        await updatePdfMaterialName(pendingEdit.id, newName);
        if (selectedTopic) fetchTopicData(selectedTopic.id);
        fetchAllData();
      } else if (pendingEdit.type === 'test') {
        if (pendingEdit.testType === 'pdf') {
          await updatePdfTestName(pendingEdit.id, newName);
        } else {
          await updateTextTestName(pendingEdit.id, newName);
        }
        if (selectedTopic) fetchTopicData(selectedTopic.id);
        fetchAllData();
      }
    } catch (err) {
      console.error('Rename failed:', err);
    } finally {
      setPendingEdit(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(dateStr));
  };

  const formatStudyTime = (seconds: number) => {
    if (!seconds || seconds < 60) return `${seconds ?? 0}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0 && s > 0) return `${m}m ${s}s`;
    return `${m}m`;
  };

  const getTopicName = (topicId: number | null) => {
    if (!topicId) return 'Unknown Topic';
    const topic = topics.find(t => t.id === topicId);
    return topic ? topic.name : 'Unknown Topic';
  };

  const isSearching = searchQuery.trim().length > 0;
  const filteredMaterials = isSearching ? allMaterials.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase())) : [];
  const filteredTests = isSearching ? allTests.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())) : [];

  const dialogConfig = pendingDelete ? {
    title:
      pendingDelete.type === 'topic' ? 'Delete Topic' :
      pendingDelete.type === 'material' ? 'Delete Material' : 'Delete Test',
    message:
      pendingDelete.type === 'topic'
        ? `Delete "${pendingDelete.name}" and ALL its tests and materials? This cannot be undone.`
        : pendingDelete.type === 'material'
        ? `Delete the material "${pendingDelete.name}"? This cannot be undone.`
        : `Delete the test "${pendingDelete.name}" and all its attempts? This cannot be undone.`,
  } : null;

  return (
    <>
      <ConfirmDialog
        isOpen={!!pendingDelete}
        title={dialogConfig?.title ?? ''}
        message={dialogConfig?.message ?? ''}
        confirmLabel="Delete"
        onConfirm={executeDelete}
        onCancel={() => setPendingDelete(null)}
      />
      <EditNameDialog
        isOpen={!!pendingEdit}
        title={
          pendingEdit?.type === 'topic' ? 'Rename Topic' :
          pendingEdit?.type === 'material' ? 'Rename Material' : 'Rename Test'
        }
        currentName={pendingEdit?.name ?? ''}
        onSave={executeEdit}
        onCancel={() => setPendingEdit(null)}
      />
    <div className="w-full mx-auto flex flex-col gap-6 h-[85vh]">
      {/* Global Search Bar */}
      <div className="w-full bg-sky-50 border border-sky-200 rounded-2xl shadow-xl p-4 flex items-center">
        <input 
          type="text" 
          placeholder="Search all materials and tests by name..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-black outline-none font-bold placeholder:text-zinc-600"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-zinc-500 hover:text-zinc-900 font-bold text-xs ml-4 tracking-widest">
            CLEAR
          </button>
        )}
      </div>

      {isSearching ? (
        <div className="flex-1 bg-sky-50 border border-sky-200 rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-0">
          <div className="p-6 border-b border-sky-200 flex justify-between items-center bg-sky-100/50">
            <h2 className="text-2xl font-black text-zinc-800 tracking-tight">Search Results for "{searchQuery}"</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            {filteredMaterials.length === 0 && filteredTests.length === 0 ? (
              <div className="text-center text-zinc-500 py-12 font-bold">No materials or tests found.</div>
            ) : (
              <>
                {filteredMaterials.length > 0 && (
                  <section>
                    <h3 className="text-lg font-black text-zinc-900 uppercase tracking-widest text-zinc-600 mb-4 flex items-center gap-2">
                      <span className="w-2 h-6 bg-indigo-500 rounded-full inline-block"></span>
                      Materials
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredMaterials.map(mat => (
                        <div
                          key={mat.id}
                          className="relative p-5 text-left bg-white hover:bg-sky-50 border border-sky-200 hover:border-blue-200 rounded-xl transition-all group flex flex-col gap-3 h-full shadow-sm hover:shadow-md"
                        >
                          <button
                            onClick={() => handleOpenMaterial(mat)}
                            className="w-full text-left flex flex-col gap-1 flex-1"
                          >
                            <div className="w-full flex justify-between items-start gap-4">
                              <h4 className="text-zinc-900 font-bold text-lg group-hover:text-sky-600 transition-colors line-clamp-2">{mat.name}</h4>
                              <span className="shrink-0 px-2 py-1 bg-sky-100 border border-sky-300 text-zinc-600 text-[9px] rounded-lg uppercase font-black">{getTopicName(mat.topicId)}</span>
                            </div>
                            <div className="mt-auto w-full pt-2 flex flex-col gap-0.5">
                              {mat.last_opened_at ? (
                                <p className="text-zinc-600 text-[10px] uppercase tracking-widest font-bold">
                                  Last opened: {formatDate(mat.last_opened_at)}
                                </p>
                              ) : (
                                <p className="text-zinc-600 text-[10px] uppercase tracking-widest font-bold">Unopened</p>
                              )}
                              {(mat.total_study_seconds ?? 0) > 0 && (
                                <p className="text-indigo-400 text-[10px] uppercase tracking-widest font-bold">
                                  Study time: {formatStudyTime(mat.total_study_seconds!)}
                                </p>
                              )}
                            </div>
                          </button>
                          {mat.id && (
                            <div className="mt-3 flex justify-end">
                              <ItemActions
                                onEdit={(e) => { e.stopPropagation(); setPendingEdit({ type: 'material', id: mat.id!, name: mat.name }); }}
                                onDelete={(e) => handleDeleteMaterial(e, mat.id!, mat.name)}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                {filteredMaterials.length > 0 && filteredTests.length > 0 && <hr className="border-sky-200" />}
                {filteredTests.length > 0 && (
                  <section>
                    <h3 className="text-lg font-black text-zinc-900 uppercase tracking-widest text-zinc-600 mb-4 flex items-center gap-2">
                      <span className="w-2 h-6 bg-blue-500 rounded-full inline-block"></span>
                      Tests
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredTests.map(test => {
                        const previewImage = getTestPreviewImage(test);
                        return (
                        <div
                          key={`${test.type}-${test.id}`}
                          className="relative p-5 text-left bg-white hover:bg-sky-50 border border-sky-200 hover:border-blue-200 rounded-xl transition-all group flex flex-col gap-3 h-full shadow-sm hover:shadow-md"
                        >
                          <button
                            onClick={() => onOpenTest && test.id && onOpenTest(test.id, test.type)}
                            className="w-full text-left flex gap-4 flex-1"
                          >
                            {previewImage && <TestImageThumbnail imagePath={previewImage} label={test.name} />}
                            <div className="min-w-0 flex-1 flex flex-col gap-1">
                              <div className="w-full flex justify-between items-start gap-4">
                                <h4 className="text-zinc-900 font-bold text-lg group-hover:text-sky-600 transition-colors line-clamp-2">
                                  {test.name}
                                  <span className={`ml-2 px-1.5 py-0.5 text-[8px] rounded uppercase font-black align-middle ${previewImage ? 'bg-emerald-100 text-emerald-700' : test.type === 'pdf' ? 'bg-sky-100 text-sky-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                    {previewImage ? 'photo' : test.type}
                                  </span>
                                </h4>
                                <span className="shrink-0 px-2 py-1 bg-sky-100 border border-sky-300 text-zinc-600 text-[9px] rounded-lg uppercase font-black">{getTopicName(test.topicId)}</span>
                              </div>
                              <div className="mt-auto w-full pt-2">
                                {test.lastAttempt ? (
                                  <p className="text-zinc-600 text-[10px] uppercase tracking-widest font-bold">
                                    Last: {formatDate(test.lastAttempt.attemptedAt)} • Score: {test.lastAttempt.score}/{test.lastAttempt.totalQuestions}
                                  </p>
                                ) : (
                                  <p className="text-zinc-600 text-[10px] uppercase tracking-widest font-bold">Unattempted</p>
                                )}
                              </div>
                            </div>
                          </button>
                          {test.id && (
                            <div className="mt-3 flex justify-end">
                              <ItemActions
                                onEdit={(e) => { e.stopPropagation(); setPendingEdit({ type: 'test', id: test.id!, name: test.name, testType: test.type }); }}
                                onDelete={(e) => handleDeleteTest(e, test.id!, test.name, test.type)}
                              />
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex gap-6 flex-1 min-h-0">
      {/* Topics List Sidebar */}
      <div className="w-1/3 flex flex-col bg-sky-50 border border-sky-200 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-sky-200">
          <h2 className="text-xl font-black text-zinc-900 tracking-tight uppercase">Topics</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {topics.length === 0 ? (
            <p className="text-center text-zinc-500 py-8 text-sm">No topics available.</p>
          ) : (
            topics.map(topic => (
              <div
                key={topic.id}
                className="relative group flex items-center"
              >
                <button
                  onClick={() => setSelectedTopic(topic)}
                  className={`flex-1 text-left px-4 py-3 rounded-xl transition-all font-bold pr-36 ${
                    selectedTopic?.id === topic.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-white text-zinc-600 hover:bg-sky-100 hover:text-zinc-900 border border-sky-200'
                  }`}
                >
                  {topic.name}
                </button>
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <ItemActions
                    onEdit={(e) => { e.stopPropagation(); setPendingEdit({ type: 'topic', id: topic.id, name: topic.name }); }}
                    onDelete={(e) => handleDeleteTopic(e, topic.id, topic.name)}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Topic Content Area */}
      <div className="flex-1 bg-sky-50 border border-sky-200 rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {!selectedTopic ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500 font-bold">
            Select a topic to view materials and tests
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="p-6 border-b border-sky-200 flex justify-between items-center bg-sky-100/50">
              <h2 className="text-2xl font-black text-zinc-900 tracking-tight">{selectedTopic.name}</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              {loading ? (
                <div className="text-center text-zinc-500 py-12">Loading...</div>
              ) : (
                <>
                  {/* Study Materials Section */}
                  <section>
                    <div className="mb-4">
                      <h3 className="text-lg font-black text-zinc-900 uppercase tracking-widest text-zinc-800">Study Materials</h3>
                    </div>
                    
                    {materials.length === 0 ? (
                      <div className="p-8 border-2 border-dashed border-sky-200 rounded-2xl text-center">
                        <p className="text-zinc-500 text-sm">No materials added yet.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {materials.map(mat => (
                          <div
                            key={mat.id}
                            className="relative p-4 text-left bg-white hover:bg-sky-50 border border-sky-200 hover:border-blue-200 rounded-xl transition-all group shadow-sm hover:shadow-md"
                          >
                            <button
                              onClick={() => handleOpenMaterial(mat)}
                              className="w-full text-left"
                            >
                              <h4 className="text-zinc-900 font-bold group-hover:text-sky-600 transition-colors pr-6">{mat.name}</h4>
                              {mat.last_opened_at ? (
                                <p className="text-zinc-600 text-[10px] mt-2 uppercase tracking-widest">
                                  Last opened: {formatDate(mat.last_opened_at)}
                                </p>
                              ) : (
                                <p className="text-zinc-600 text-[10px] mt-2 uppercase tracking-widest">Unopened</p>
                              )}
                              {(mat.total_study_seconds ?? 0) > 0 && (
                                <p className="text-indigo-400 text-[10px] mt-0.5 uppercase tracking-widest">
                                  Study time: {formatStudyTime(mat.total_study_seconds!)}
                                </p>
                              )}
                            </button>
                            {mat.id && (
                              <div className="mt-3 flex justify-end">
                                <ItemActions
                                  onEdit={(e) => { e.stopPropagation(); setPendingEdit({ type: 'material', id: mat.id!, name: mat.name }); }}
                                  onDelete={(e) => handleDeleteMaterial(e, mat.id!, mat.name)}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <hr className="border-sky-200" />

                  {/* Tests Section */}
                  <section>
                    <div className="mb-4">
                      <h3 className="text-lg font-black text-zinc-900 uppercase tracking-widest text-zinc-600">Tests</h3>
                      <p className="text-xs text-zinc-500 mt-1">Tests registered under this topic.</p>
                    </div>
                    
                    {tests.length === 0 ? (
                      <div className="p-8 border-2 border-dashed border-sky-200 rounded-2xl text-center">
                        <p className="text-zinc-500 text-sm">No tests registered yet.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {tests.map(test => {
                          const previewImage = getTestPreviewImage(test);
                          return (
                          <div
                            key={`${test.type}-${test.id}`}
                            className="relative p-4 text-left bg-white hover:bg-sky-50 border border-sky-200 hover:border-blue-200 rounded-xl transition-all group shadow-sm hover:shadow-md"
                          >
                            <button
                              onClick={() => onOpenTest && test.id && onOpenTest(test.id, test.type)}
                              className="w-full text-left flex gap-3"
                            >
                              {previewImage && <TestImageThumbnail imagePath={previewImage} label={test.name} />}
                              <div className="min-w-0 flex-1">
                                <h4 className="text-zinc-900 font-bold group-hover:text-sky-600 transition-colors pr-6">
                                  {test.name}
                                  <span className={`ml-2 px-1.5 py-0.5 text-[8px] rounded uppercase font-black align-middle ${previewImage ? 'bg-emerald-100 text-emerald-700' : test.type === 'pdf' ? 'bg-sky-100 text-sky-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                    {previewImage ? 'photo' : test.type}
                                  </span>
                                </h4>
                                {test.lastAttempt ? (
                                  <p className="text-zinc-600 text-[10px] mt-2 uppercase tracking-widest">
                                    Last: {formatDate(test.lastAttempt.attemptedAt)} • Score: {test.lastAttempt.score}/{test.lastAttempt.totalQuestions}
                                  </p>
                                ) : (
                                  <p className="text-zinc-600 text-[10px] mt-2 uppercase tracking-widest">Unattempted</p>
                                )}
                              </div>
                            </button>
                            {test.id && (
                              <div className="mt-3 flex justify-end">
                                <ItemActions
                                  onEdit={(e) => { e.stopPropagation(); setPendingEdit({ type: 'test', id: test.id!, name: test.name, testType: test.type }); }}
                                  onDelete={(e) => handleDeleteTest(e, test.id!, test.name, test.type)}
                                />
                              </div>
                            )}
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          </div>
        )}
      </div>
        </div>
      )}
    </div>
    </>
  );
};
