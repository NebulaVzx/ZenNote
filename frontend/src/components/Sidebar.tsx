import { useState } from 'react';
import { FileText, Plus, Search, ChevronRight, ChevronDown } from 'lucide-react';
import type { Page } from '../types';

interface SidebarProps {
  pages: Page[];
  activePageId?: string;
  onSelectPage: (page: Page) => void;
  onCreatePage: (parentId?: string) => void;
  onOpenSearch: () => void;
}

function PageTreeItem({
  page,
  pages,
  level,
  activePageId,
  onSelectPage,
  onCreatePage,
}: {
  page: Page;
  pages: Page[];
  level: number;
  activePageId?: string;
  onSelectPage: (p: Page) => void;
  onCreatePage: (parentId?: string) => void;
}) {
  const children = pages.filter((p) => p.parent_id === page.id);
  const [expanded, setExpanded] = useState(true);
  const isActive = page.id === activePageId;

  return (
    <div>
      <div
        className={[
          'flex items-center gap-1 px-2 py-1.5 text-sm cursor-pointer rounded mx-2',
          isActive ? 'bg-[#2a2a2a] text-white' : 'text-gray-300 hover:bg-[#252525]',
        ].join(' ')}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => onSelectPage(page)}
      >
        {children.length > 0 ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-0.5 hover:bg-[#333] rounded"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-[18px]" />
        )}
        <FileText size={14} className="text-gray-400 shrink-0" />
        <span className="truncate flex-1">{page.title || 'Untitled'}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCreatePage(page.id);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#333] rounded"
        >
          <Plus size={12} />
        </button>
      </div>
      {expanded &&
        children.map((child) => (
          <PageTreeItem
            key={child.id}
            page={child}
            pages={pages}
            level={level + 1}
            activePageId={activePageId}
            onSelectPage={onSelectPage}
            onCreatePage={onCreatePage}
          />
        ))}
    </div>
  );
}

export function Sidebar({ pages, activePageId, onSelectPage, onCreatePage, onOpenSearch }: SidebarProps) {
  const safePages = pages || [];
  const rootPages = safePages.filter((p) => !p.parent_id);

  return (
    <div className="w-[260px] bg-[#202020] border-r border-[#2f2f2f] flex flex-col h-full">
      <div className="p-3">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 bg-[#2a2a2a] hover:bg-[#333] rounded transition-colors"
        >
          <Search size={14} />
          <span>Search (Ctrl+P)</span>
        </button>
      </div>

      <div className="flex items-center justify-between px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
        <span>Pages</span>
        <button
          onClick={() => onCreatePage()}
          className="p-1 hover:bg-[#2a2a2a] rounded"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {rootPages.map((page) => (
          <div key={page.id} className="group">
            <PageTreeItem
              page={page}
              pages={safePages}
              level={0}
              activePageId={activePageId}
              onSelectPage={onSelectPage}
              onCreatePage={onCreatePage}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
