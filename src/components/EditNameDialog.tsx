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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <h3 className="text-white font-black text-lg tracking-tight mb-1">{title}</h3>
          <p className="text-zinc-500 text-xs uppercase tracking-widest">Enter new name</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-950 border border-zinc-700 rounded-xl text-white font-bold outline-none focus:border-blue-500 transition-colors"
            placeholder="New name..."
          />
          <div className="flex gap-3 mt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-sm transition-all border border-zinc-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!value.trim()}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-black text-sm transition-all shadow-lg shadow-blue-900/30"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
