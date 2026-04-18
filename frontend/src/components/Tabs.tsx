import { X } from 'lucide-react';
import type { Tab } from '../types';

interface TabsProps {
  tabs: Tab[];
  activePageId?: string;
  onSwitch: (pageId: string) => void;
  onClose: (pageId: string) => void;
}

export function Tabs({ tabs, activePageId, onSwitch, onClose }: TabsProps) {
  if (tabs.length === 0) return null;

  return (
    <div className="flex items-center h-10 bg-[var(--bg-primary)] border-b border-[var(--border-color)] overflow-x-auto">
      {tabs.map((tab) => {
        const active = tab.pageId === activePageId;
        return (
          <div
            key={tab.pageId}
            onClick={() => onSwitch(tab.pageId)}
            className={[
              'group flex items-center gap-2 px-3 h-full min-w-[120px] max-w-[200px] cursor-pointer border-r border-[var(--border-color)] text-sm select-none',
              active ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]',
            ].join(' ')}
          >
            <span className="truncate flex-1">{tab.title || 'Untitled'}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.pageId);
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[var(--hover)] rounded"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
