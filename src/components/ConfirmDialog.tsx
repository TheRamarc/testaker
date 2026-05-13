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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-white border border-sky-200 rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 mx-auto">
          <span className="text-red-400 text-xl font-black">!</span>
        </div>

        {/* Text */}
        <div className="text-center">
          <h3 className="text-zinc-900 font-black text-lg tracking-tight mb-2">{title}</h3>
          <p className="text-zinc-600 text-sm leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-zinc-700 font-bold text-sm transition-all border border-sky-300"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-sm transition-all shadow-lg shadow-red-900/30"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
