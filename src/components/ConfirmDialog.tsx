import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/55 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white border border-sky-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-4 flex items-start gap-4">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-red-50 border border-red-200 shrink-0">
            <span className="text-red-600 text-xl font-black">!</span>
          </div>
          <div className="min-w-0">
            <h3 className="text-zinc-950 font-black text-lg tracking-tight">{title}</h3>
            <p className="text-zinc-600 text-sm leading-relaxed mt-1">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 bg-sky-50 border-t border-sky-200">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-sky-100 text-zinc-700 font-bold text-sm transition-all border border-sky-300"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-sm transition-all shadow-lg shadow-red-900/20"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
