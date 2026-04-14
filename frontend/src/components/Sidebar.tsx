import { useState } from 'react';
import { FileText, Plus, Search, ChevronRight, ChevronDown, GripVertical, Trash2 } from 'lucide-react';
import type { Page } from '../types';

interface SidebarProps {
  pages: Page[];
  activePageId?: string;
  onSelectPage: (page: Page) => void;
  onCreatePage: (parentId?: string) => void;
  onDeletePage: (pageId: string) => void;
  onDeletePages?: (pageIds: string[]) => void;
  onOpenSearch: () => void;
  onReorderPages?: (pages: Page[]) => void;
}

function PageTreeItem({
  page,
  pages,
  level,
  activePageId,
  onSelectPage,
  onCreatePage,
  onDeletePage,
  draggedId,
  dragOverId,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  selectionMode,
  selectedIds,
  onToggleSelect,
}: {
  page: Page;
  pages: Page[];
  level: number;
  activePageId?: string;
  onSelectPage: (p: Page) => void;
  onCreatePage: (parentId?: string) => void;
  onDeletePage: (pageId: string) => void;
  draggedId: string | null;
  dragOverId: string | null;
  onDragStart: (pageId: string) => void;
  onDragEnd: () => void;
  onDragOver: (pageId: string) => void;
  onDragLeave: (pageId: string) => void;
  onDrop: (pageId: string) => void;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (pageId: string) => void;
}) {
  const children = pages.filter((p) => p.parent_id === page.id);
  const [expanded, setExpanded] = useState(true);
  const isActive = page.id === activePageId;
  const isSelected = selectedIds.has(page.id);
  const isDragging = draggedId === page.id;
  const isDragOver = dragOverId === page.id;

  return (
    <div>
      <div
        className={[
          'flex items-center gap-1 px-2 py-1.5 text-sm rounded mx-2 select-none transition-colors',
          isActive ? 'bg-[#2a2a2a] text-white' : 'text-gray-300 hover:bg-[#252525]',
          isDragOver ? 'ring-1 ring-blue-500 bg-blue-500/10' : '',
          isDragging ? 'opacity-50' : '',
        ].join(' ')}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => onSelectPage(page)}
        onDragOver={(e) => { e.preventDefault(); onDragOver(page.id); }}
        onDragLeave={() => onDragLeave(page.id)}
        onDrop={(e) => { e.preventDefault(); onDrop(page.id); }}
      >
        {selectionMode ? (
          <input
            type="checkbox"
            className="w-4 h-4 accent-[#6366f1] shrink-0"
            checked={isSelected}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => { e.stopPropagation(); onToggleSelect(page.id); }}
          />
        ) : (
          <div
            draggable
            onDragStart={() => onDragStart(page.id)}
            onDragEnd={onDragEnd}
            onClick={(e) => e.stopPropagation()}
            className="p-0.5 text-gray-500 cursor-grab active:cursor-grabbing hover:bg-[#333] rounded"
          >
            <GripVertical size={14} />
          </div>
        )}
        {children.length > 0 ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="p-0.5 hover:bg-[#333] rounded"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-[18px]" />
        )}
        <FileText size={14} className="text-gray-400 shrink-0" />
        <span className="truncate flex-1">{page.title || 'Untitled'}</span>
        {!selectionMode && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onCreatePage(page.id); }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#333] rounded"
            >
              <Plus size={12} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete "${page.title || 'Untitled'}"?`)) onDeletePage(page.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-600/80 rounded text-gray-400 hover:text-white"
            >
              <Trash2 size={12} />
            </button>
          </>
        )}
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
            onDeletePage={onDeletePage}
            draggedId={draggedId}
            dragOverId={dragOverId}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
          />
        ))}
    </div>
  );
}

export function Sidebar({ pages, activePageId, onSelectPage, onCreatePage, onDeletePage, onDeletePages, onOpenSearch, onReorderPages }: SidebarProps) {
  const safePages = pages || [];
  const rootPages = safePages.filter((p) => !p.parent_id);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const toggleSelect = (pageId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected pages?`)) return;
    const ids = Array.from(selectedIds);
    await onDeletePages?.(ids);
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const handleDragStart = (pageId: string) => setDraggedId(pageId);
  const handleDragEnd = () => { setDraggedId(null); setDragOverId(null); };
  const handleDragOver = (pageId: string) => { if (draggedId && draggedId !== pageId) setDragOverId(pageId); };
  const handleDragLeave = (pageId: string) => { if (dragOverId === pageId) setDragOverId(null); };

  const applyReorder = (draggedId: string, targetParentId?: string) => {
    if (!onReorderPages) return;
    const updated = safePages.map((p) => {
      if (p.id === draggedId) {
        return { ...p, parent_id: targetParentId };
      }
      return p;
    });
    onReorderPages(updated);
  };

  const handleDrop = (targetPageId: string) => {
    if (!draggedId || draggedId === targetPageId) {
      handleDragEnd();
      return;
    }
    const target = safePages.find((p) => p.id === targetPageId);
    if (!target) {
      handleDragEnd();
      return;
    }
    // Dropping on a page makes the dragged page a child of that page
    applyReorder(draggedId, targetPageId);
    handleDragEnd();
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedId) return;
    applyReorder(draggedId, undefined);
    handleDragEnd();
  };

  return (
    <div id="sidebar" className="w-[260px] bg-[#202020] border-r border-[#2f2f2f] flex flex-col h-full">
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
        <div className="flex items-center gap-1">
          {selectionMode ? (
            <>
              <button
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0}
                className="px-2 py-1 text-xs bg-red-600/80 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded"
              >
                Delete ({selectedIds.size})
              </button>
              <button
                onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }}
                className="px-2 py-1 text-xs hover:bg-[#2a2a2a] rounded"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setSelectionMode(true)} className="px-2 py-1 text-xs hover:bg-[#2a2a2a] rounded">Select</button>
              <button onClick={() => onCreatePage()} className="p-1 hover:bg-[#2a2a2a] rounded"><Plus size={14} /></button>
            </>
          )}
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto py-1"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleRootDrop}
      >
        {rootPages.map((page) => (
          <div key={page.id} className="group">
            <PageTreeItem
              page={page}
              pages={safePages}
              level={0}
              activePageId={activePageId}
              onSelectPage={onSelectPage}
              onCreatePage={onCreatePage}
              onDeletePage={onDeletePage}
              draggedId={draggedId}
              dragOverId={dragOverId}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
