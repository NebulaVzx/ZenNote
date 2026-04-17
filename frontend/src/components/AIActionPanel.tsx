import { Sparkles, PenLine, Globe, HelpCircle, Loader2, X } from 'lucide-react';
import type { AIAction } from '../types';

interface Props {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onAction: (action: AIAction, language?: string) => void;
}

export function AIActionPanel({ open, loading, onClose, onAction }: Props) {
  if (!open) return null;

  const actions: { key: AIAction; label: string; icon: React.ReactNode }[] = [
    { key: 'continue', label: 'Continue', icon: <Sparkles size={14} /> },
    { key: 'polish', label: 'Polish', icon: <PenLine size={14} /> },
    { key: 'translate', label: 'Translate', icon: <Globe size={14} /> },
    { key: 'explain', label: 'Explain', icon: <HelpCircle size={14} /> },
  ];

  return (
    <div className="absolute z-50 w-56 bg-[#252525] border border-[#333] rounded-md shadow-xl py-2"
    >
      <div className="flex items-center justify-between px-3 pb-2 border-b border-[#333]">
        <span className="text-xs text-gray-400">Ask AI</span>
        {loading ? (
          <Loader2 size={14} className="animate-spin text-gray-400" />
        ) : (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <X size={14} />
          </button>
        )}
      </div>
      <div className="px-2 pt-1 space-y-0.5">
        {actions.map((a) => (
          <button
            key={a.key}
            disabled={loading}
            onClick={() => {
              if (a.key === 'translate') {
                const lang = window.prompt('Translate to (e.g. English):', 'English');
                if (lang) onAction(a.key, lang);
              } else {
                onAction(a.key);
              }
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-left text-gray-200 rounded hover:bg-[#333] disabled:opacity-50"
          >
            <span className="text-gray-400">{a.icon}</span>
            <span>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
