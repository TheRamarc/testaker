import React, { useState, useEffect, useRef } from 'react';

interface EditNameDialogProps {
  isOpen: boolean;
  title: string;
  currentName: string;
  onSave: (newName: string) => void;
  onCancel: () => void;
}

export const EditNameDialog: React.FC<EditNameDialogProps> = ({
  isOpen,
  title,
  currentName,
  onSave,
  onCancel,
}) => {
  const [value, setValue] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(currentName);
      setTimeout(() => inputRef.current?.select(), 50);
    }
  }, [isOpen, currentName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed && trimmed !== currentName) onSave(trimmed);
    else onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/55 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white border border-sky-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-4">
          <h3 className="text-zinc-950 font-black text-lg tracking-tight">{title}</h3>
          <p className="text-zinc-500 text-xs uppercase tracking-widest mt-1">Enter new name</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 pb-6">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-sky-300 rounded-xl text-zinc-900 font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
            placeholder="New name..."
          />
          </div>
          <div className="flex justify-end gap-3 p-4 bg-sky-50 border-t border-sky-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-sky-100 text-zinc-700 font-bold text-sm transition-all border border-sky-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!value.trim()}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-black text-sm transition-all shadow-lg shadow-blue-900/20"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
