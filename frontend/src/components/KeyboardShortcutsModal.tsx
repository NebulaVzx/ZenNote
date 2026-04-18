import { useEffect, useRef } from 'react';
import { Command, X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string;
  desc: string;
}

interface ShortcutGroup {
  title: string;
  items: ShortcutItem[];
}

const groups: ShortcutGroup[] = [
  {
    title: 'Navigation',
    items: [
      { keys: 'Ctrl + P', desc: 'Global search' },
      { keys: 'Ctrl + F', desc: 'Page search' },
      { keys: 'Ctrl + /', desc: 'Keyboard shortcuts' },
      { keys: 'Ctrl + \\', desc: 'Toggle sidebar' },
    ],
  },
  {
    title: 'Editor',
    items: [
      { keys: 'Ctrl + B', desc: 'Bold' },
      { keys: 'Ctrl + I', desc: 'Italic' },
      { keys: 'Ctrl + A', desc: 'Select current block (single) / all blocks (double)' },
      { keys: '/', desc: 'Slash command' },
      { keys: 'Esc', desc: 'Close modal / search' },
    ],
  },
  {
    title: 'Markdown shortcuts',
    items: [
      { keys: '#', desc: 'Heading 1' },
      { keys: '##', desc: 'Heading 2' },
      { keys: '###', desc: 'Heading 3' },
      { keys: '>', desc: 'Quote block' },
      { keys: '-', desc: 'Bullet list' },
      { keys: '1.', desc: 'Numbered list' },
      { keys: '[]', desc: 'Todo list' },
      { keys: '```', desc: 'Code block' },
    ],
  },
];

export function KeyboardShortcutsModal({ open, onClose }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => closeButtonRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[560px] max-w-[90vw] bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2 text-[var(--text-primary)]">
            <Command size={18} className="text-[var(--text-secondary)]" />
            <h2 className="text-base font-medium">Keyboard shortcuts</h2>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-5">
          {groups.map((g) => (
            <div key={g.title}>
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">{g.title}</h3>
              <div className="space-y-1.5">
                {g.items.map((item) => (
                  <div key={item.keys + item.desc} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-primary)]">{item.desc}</span>
                    <span className="px-2 py-0.5 bg-[var(--bg-tertiary)] rounded text-xs text-[var(--text-primary)] border border-[var(--border-color)] whitespace-nowrap ml-4">
                      {item.keys}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 py-2 border-t border-[var(--border-color)] text-xs text-[var(--text-secondary)] text-center">
          Press ESC to close
        </div>
      </div>
    </div>
  );
}
