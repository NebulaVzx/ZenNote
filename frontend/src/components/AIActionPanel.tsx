import { useState } from 'react';
import { Sparkles, PenLine, Globe, HelpCircle, Loader2, X, AlignLeft, AlignJustify, FileText, Code2, Briefcase, Coffee, Smile, ChevronRight } from 'lucide-react';
import type { AIAction } from '../types';

interface Props {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onAction: (action: AIAction, language?: string) => void;
}

type ActionItem =
  | { type: 'action'; key: AIAction; label: string; icon: React.ReactNode; needsPrompt?: boolean; promptLabel?: string }
  | { type: 'divider' }
  | { type: 'submenu'; key: string; label: string; icon: React.ReactNode; children: ActionItem[] };

export function AIActionPanel({ open, loading, onClose, onAction }: Props) {
  const [expandedSubmenu, setExpandedSubmenu] = useState<string | null>(null);

  if (!open) return null;

  const actions: ActionItem[] = [
    { type: 'action', key: 'continue', label: 'Continue', icon: <Sparkles size={14} /> },
    { type: 'action', key: 'polish', label: 'Polish', icon: <PenLine size={14} /> },
    { type: 'divider' },
    { type: 'action', key: 'summary', label: 'Summarize', icon: <FileText size={14} /> },
    { type: 'action', key: 'explain', label: 'Explain', icon: <HelpCircle size={14} /> },
    { type: 'action', key: 'shorter', label: 'Make shorter', icon: <AlignLeft size={14} /> },
    { type: 'action', key: 'longer', label: 'Make longer', icon: <AlignJustify size={14} /> },
    { type: 'divider' },
    {
      type: 'submenu',
      key: 'tone',
      label: 'Change tone',
      icon: <Smile size={14} />,
      children: [
        { type: 'action', key: 'professional', label: 'Professional', icon: <Briefcase size={14} /> },
        { type: 'action', key: 'casual', label: 'Casual', icon: <Coffee size={14} /> },
        { type: 'action', key: 'friendly', label: 'Friendly', icon: <Smile size={14} /> },
      ],
    },
    { type: 'action', key: 'code', label: 'Generate code', icon: <Code2 size={14} />, needsPrompt: true, promptLabel: 'Language (e.g. TypeScript):' },
    { type: 'action', key: 'translate', label: 'Translate', icon: <Globe size={14} />, needsPrompt: true, promptLabel: 'Translate to (e.g. English):' },
  ];

  const handleClick = (item: ActionItem) => {
    if (item.type !== 'action') return;
    if (item.needsPrompt) {
      const lang = window.prompt(item.promptLabel || 'Enter value:', item.key === 'translate' ? 'English' : 'TypeScript');
      if (lang) onAction(item.key, lang);
    } else {
      onAction(item.key);
    }
  };

  const renderItem = (item: ActionItem, depth = 0) => {
    if (item.type === 'divider') {
      return <div key={`div-${Math.random()}`} className="h-px bg-[var(--border-color)] my-1" />;
    }

    if (item.type === 'submenu') {
      const isOpen = expandedSubmenu === item.key;
      return (
        <div key={item.key}>
          <button
            disabled={loading}
            onClick={() => setExpandedSubmenu(isOpen ? null : item.key)}
            className="w-full flex items-center justify-between px-2 py-1.5 text-sm text-left text-[var(--text-primary)] rounded hover:bg-[var(--hover)] disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              <span className="text-[var(--text-secondary)]">{item.icon}</span>
              <span>{item.label}</span>
            </span>
            <ChevronRight size={12} className={`text-[var(--text-secondary)] transition-transform ${isOpen ? 'rotate-90' : ''}`} />
          </button>
          {isOpen && (
            <div className="pl-4 space-y-0.5">
              {item.children.map((child) => renderItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={item.key}
        disabled={loading}
        onClick={() => handleClick(item)}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-left text-[var(--text-primary)] rounded hover:bg-[var(--hover)] disabled:opacity-50"
      >
        <span className="text-[var(--text-secondary)]">{item.icon}</span>
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <div className="absolute z-50 w-56 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-md shadow-xl py-2">
      <div className="flex items-center justify-between px-3 pb-2 border-b border-[var(--border-color)]">
        <span className="text-xs text-[var(--text-secondary)]">Ask AI</span>
        {loading ? (
          <Loader2 size={14} className="animate-spin text-[var(--text-secondary)]" />
        ) : (
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <X size={14} />
          </button>
        )}
      </div>
      <div className="px-2 pt-1 space-y-0.5">
        {actions.map((a) => renderItem(a))}
      </div>
    </div>
  );
}
