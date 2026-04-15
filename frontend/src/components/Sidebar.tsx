import { useState } from 'react';
import { FileText, Plus, Search, ChevronRight, ChevronDown, GripVertical, Trash2 } from 'lucide-react';
import type { Page } from '../types';
import { ConfirmModal } from './ConfirmModal';

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
  onRequestDelete,
  draggedId,
  dragOverId,
  dragOverPos,
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
  onRequestDelete: (page: Page) => void;
  draggedId: string | null;
  dragOverId: string | null;
  dragOverPos: 'before' | 'after' | 'inside' | null;
  onDragStart: (e: React.DragEvent, pageId: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, pageId: string) => void;
  onDragLeave: (pageId: string) => void;
  onDrop: (e: React.DragEvent, pageId: string) => void;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (pageId: string) => void;
}) {
  const children = pages
    .filter((p) => p.parent_id === page.id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const [expanded, setExpanded] = useState(true);
  const isActive = page.id === activePageId;
  const isSelected = selectedIds.has(page.id);
  const isDragging = draggedId === page.id;
  const isDragOver = dragOverId === page.id;
  const myPos = isDragOver ? dragOverPos : null;

  return (
    <div className="relative">
      {myPos === 'before' && (
        <div className="absolute -top-0.5 left-2 right-2 h-0.5 bg-blue-500 rounded z-10 pointer-events-none" />
      )}
      <div
        className={[
          'flex items-center gap-1 px-2 py-1.5 text-sm rounded mx-2 select-none transition-colors',
          isActive ? 'bg-[#2a2a2a] text-white' : 'text-gray-300 hover:bg-[#252525]',
          myPos === 'inside' ? 'ring-1 ring-blue-500 bg-blue-500/10' : '',
          isDragging ? 'opacity-50' : '',
        ].join(' ')}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => onSelectPage(page)}
        onDragOver={(e) => { e.preventDefault(); onDragOver(e, page.id); }}
        onDragLeave={() => onDragLeave(page.id)}
        onDrop={(e) => { e.preventDefault(); onDrop(e, page.id); }}
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
            onDragStart={(e) => onDragStart(e, page.id)}
            onDragEnd={onDragEnd}
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 text-gray-500 cursor-grab active:cursor-grabbing hover:bg-[#333] rounded select-none"
            title="Drag to move"
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
                onRequestDelete(page);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-600/80 rounded text-gray-400 hover:text-white"
            >
              <Trash2 size={12} />
            </button>
          </>
        )}
      </div>
      {myPos === 'after' && (
        <div className="absolute -bottom-0.5 left-2 right-2 h-0.5 bg-blue-500 rounded z-10 pointer-events-none" />
      )}
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
            onRequestDelete={onRequestDelete}
            draggedId={draggedId}
            dragOverId={dragOverId}
            dragOverPos={dragOverPos}
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

function getDescendantIds(pageId: string, pages: Page[]): string[] {
  const ids: string[] = [];
  const queue = [pageId];
  while (queue.length) {
    const current = queue.shift()!;
    ids.push(current);
    pages.filter((p) => p.parent_id === current).forEach((p) => queue.push(p.id));
  }
  return ids;
}

export function Sidebar({ pages, activePageId, onSelectPage, onCreatePage, onDeletePage, onDeletePages, onOpenSearch, onReorderPages }: SidebarProps) {
  const safePages = pages || [];
  const rootPages = safePages
    .filter((p) => !p.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverPos, setDragOverPos] = useState<'before' | 'after' | 'inside' | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const toggleSelect = (pageId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const ids = getDescendantIds(pageId, safePages);
      const selecting = !next.has(pageId);
      ids.forEach((id) => {
        if (selecting) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  const handleRequestDelete = (page: Page) => {
    setConfirmState({
      title: 'Delete page',
      message: `Delete "${page.title || 'Untitled'}"?`,
      onConfirm: () => onDeletePage(page.id),
    });
    setConfirmOpen(true);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setConfirmState({
      title: 'Delete pages',
      message: `Delete ${selectedIds.size} selected pages?`,
      onConfirm: () => {
        const ids = Array.from(selectedIds);
        onDeletePages?.(ids);
        setSelectedIds(new Set());
        setSelectionMode(false);
      },
    });
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    confirmState?.onConfirm();
    setConfirmOpen(false);
    setConfirmState(null);
  };

  const handleDragStart = (e: React.DragEvent, pageId: string) => {
    e.dataTransfer.setData('text/plain', pageId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedId(pageId);
  };
  const handleDragEnd = () => { setDraggedId(null); setDragOverId(null); setDragOverPos(null); };
  const handleDragOver = (e: React.DragEvent, pageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!draggedId || draggedId === pageId) {
      setDragOverId(null);
      setDragOverPos(null);
      return;
    }
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const pct = y / rect.height;
    let pos: 'before' | 'after' | 'inside' = 'inside';
    if (pct < 0.3) pos = 'before';
    else if (pct > 0.7) pos = 'after';
    setDragOverId(pageId);
    setDragOverPos(pos);
  };
  const handleDragLeave = (pageId: string) => {
    if (dragOverId === pageId) {
      setDragOverId(null);
      setDragOverPos(null);
    }
  };

  const reorderSiblings = (draggedId: string, target: Page, pos: 'before' | 'after') => {
    if (!onReorderPages) return;
    const siblings = safePages
      .filter((p) => p.parent_id === target.parent_id)
      .sort((a, b) => a.sort_order - b.sort_order);
    const draggedIdx = siblings.findIndex((p) => p.id === draggedId);
    if (draggedIdx !== -1) {
      siblings.splice(draggedIdx, 1);
    }
    const targetIdx = siblings.findIndex((p) => p.id === target.id);
    const insertIdx = pos === 'before' ? targetIdx : targetIdx + 1;
    const draggedPage = safePages.find((p) => p.id === draggedId);
    if (draggedPage) {
      siblings.splice(insertIdx, 0, draggedPage);
    }
    const updated = safePages.map((p) => {
      const idx = siblings.findIndex((s) => s.id === p.id);
      if (idx !== -1) {
        return { ...p, parent_id: target.parent_id, sort_order: idx };
      }
      return p;
    });
    onReorderPages(updated);
  };

  const applyReorder = (draggedId: string, targetParentId?: string) => {
    if (!onReorderPages) return;
    const siblings = safePages
      .filter((p) => p.parent_id === targetParentId)
      .sort((a, b) => a.sort_order - b.sort_order);
    const draggedPage = safePages.find((p) => p.id === draggedId);
    if (!draggedPage) return;
    if (draggedPage.parent_id === targetParentId) return; // already there
    siblings.push(draggedPage);
    const updated = safePages.map((p) => {
      const idx = siblings.findIndex((s) => s.id === p.id);
      if (idx !== -1) {
        return { ...p, parent_id: targetParentId, sort_order: idx };
      }
      return p;
    });
    onReorderPages(updated);
  };

  const handleDrop = (e: React.DragEvent, targetPageId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetPageId) {
      handleDragEnd();
      return;
    }
    const target = safePages.find((p) => p.id === targetPageId);
    if (!target) {
      handleDragEnd();
      return;
    }
    const pos = dragOverPos || 'inside';
    if (pos === 'inside') {
      applyReorder(draggedId, targetPageId);
    } else {
      reorderSiblings(draggedId, target, pos);
    }
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
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
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
              onRequestDelete={handleRequestDelete}
              draggedId={draggedId}
              dragOverId={dragOverId}
              dragOverPos={dragOverPos}
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

      <ConfirmModal
        open={confirmOpen}
        title={confirmState?.title || ''}
        message={confirmState?.message || ''}
        onConfirm={handleConfirm}
        onCancel={() => { setConfirmOpen(false); setConfirmState(null); }}
      />
    </div>
  );
}
