import { useState, useEffect, useRef } from 'react';
import { FileText, Plus, Search, ChevronRight, ChevronDown, GripVertical, Trash2, RotateCcw, Clock, Star, TreePine, Copy } from 'lucide-react';
import type { Page } from '../types';
import { ConfirmModal } from './ConfirmModal';

interface SidebarProps {
  pages: Page[];
  trashPages?: Page[];
  activePageId?: string;
  onSelectPage: (page: Page) => void;
  onCreatePage: (parentId?: string) => void;
  onDeletePage: (pageId: string) => void;
  onDeletePages?: (pageIds: string[]) => void;
  onRestorePage?: (pageId: string) => void;
  onPermanentDeletePage?: (pageId: string) => void;
  onOpenSearch: () => void;
  onReorderPages?: (pages: Page[]) => void;
  onToggleFavorite?: (pageId: string, isFavorite: number) => void;
}

function PageTreeItem({
  page,
  pages,
  level,
  activePageId,
  onSelectPage,
  onCreatePage,
  onRequestDelete,
  onContextMenu,
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
  onContextMenu: (e: React.MouseEvent, page: Page) => void;
  draggedId: string | null;
  dragOverId: string | null;
  dragOverPos: 'before' | 'after' | 'inside' | null;
  onDragStart: (e: React.DragEvent, pageId: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, pageId: string) => void;
  onDragLeave: (e: React.DragEvent, pageId: string) => void;
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
        onContextMenu={(e) => onContextMenu(e, page)}
        onDragOver={(e) => { e.preventDefault(); onDragOver(e, page.id); }}
        onDragEnter={(e) => { e.preventDefault(); }}
        onDragLeave={(e) => onDragLeave(e, page.id)}
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
        {page.icon ? (
          <span className="text-sm shrink-0 w-[14px] text-center">{page.icon}</span>
        ) : (
          <FileText size={14} className="text-gray-400 shrink-0" />
        )}
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
            onContextMenu={onContextMenu}
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

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function Sidebar({ pages, trashPages = [], activePageId, onSelectPage, onCreatePage, onDeletePage, onDeletePages, onRestorePage, onPermanentDeletePage, onOpenSearch, onReorderPages, onToggleFavorite }: SidebarProps) {
  const safePages = pages || [];
  const safeTrash = trashPages || [];
  const rootPages = safePages
    .filter((p) => !p.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const favoritePages = safePages
    .filter((p) => p.is_favorite === 1)
    .sort((a, b) => b.updated_at - a.updated_at);
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
  const [trashExpanded, setTrashExpanded] = useState(true);
  const [sidebarView, setSidebarView] = useState<'tree' | 'recent'>('tree');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    pageId: string;
    open: boolean;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, []);

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

  const handleContextMenu = (e: React.MouseEvent, page: Page) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, pageId: page.id, open: true });
  };

  const handleDuplicate = (pageId: string) => {
    const page = safePages.find((p) => p.id === pageId);
    if (!page) return;
    const siblings = safePages.filter((p) => p.parent_id === page.parent_id);
    const existingTitles = new Set(siblings.map((p) => p.title));
    let title = `Copy of ${page.title || 'Untitled'}`;
    if (existingTitles.has(title)) {
      let counter = 2;
      while (existingTitles.has(`${title} ${counter}`)) {
        counter++;
      }
      title = `${title} ${counter}`;
    }
    onCreatePage(page.parent_id);
    // Note: we'd ideally copy blocks too, but that's async; we'll just create a new page with same parent
  };

  const handleDragStart = (e: React.DragEvent, pageId: string) => {
    e.dataTransfer.setData('text/plain', pageId);
    e.dataTransfer.effectAllowed = 'move';
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
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
  const handleDragLeave = (e: React.DragEvent, pageId: string) => {
    const related = e.relatedTarget as Node | null;
    const current = e.currentTarget as Node | null;
    if (current && related && current.contains(related)) {
      return;
    }
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
    if (draggedPage.parent_id === targetParentId) return;
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
    const raw = e.dataTransfer.getData('text/plain');
    const draggedIdFromData = raw || draggedId;
    if (!draggedIdFromData || draggedIdFromData === targetPageId) {
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
      applyReorder(draggedIdFromData, targetPageId);
    } else {
      reorderSiblings(draggedIdFromData, target, pos);
    }
    handleDragEnd();
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('text/plain');
    const draggedIdFromData = raw || draggedId;
    if (!draggedIdFromData) {
      handleDragEnd();
      return;
    }
    applyReorder(draggedIdFromData, undefined);
    handleDragEnd();
  };

  const recentPages = [...safePages]
    .sort((a, b) => b.updated_at - a.updated_at)
    .slice(0, 15);

  const contextMenuPage = contextMenu ? safePages.find((p) => p.id === contextMenu.pageId) : null;

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

      {favoritePages.length > 0 && (
        <div className="px-3 pb-2">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
            <Star size={12} /> Favorites
          </div>
          {favoritePages.map((page) => (
            <div
              key={page.id}
              className={[
                'flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer',
                page.id === activePageId ? 'bg-[#2a2a2a] text-white' : 'text-gray-300 hover:bg-[#252525]',
              ].join(' ')}
              onClick={() => onSelectPage(page)}
            >
              {page.icon ? (
                <span className="text-sm shrink-0 w-[14px] text-center">{page.icon}</span>
              ) : (
                <FileText size={14} className="text-gray-400 shrink-0" />
              )}
              <span className="truncate flex-1">{page.title || 'Untitled'}</span>
            </div>
          ))}
        </div>
      )}

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
              <div className="flex items-center gap-0.5 mr-1">
                <button
                  onClick={() => setSidebarView('tree')}
                  className={[
                    'p-1 rounded',
                    sidebarView === 'tree' ? 'bg-[#2a2a2a] text-gray-200' : 'text-gray-500 hover:text-gray-300',
                  ].join(' ')}
                  title="Tree view"
                >
                  <TreePine size={12} />
                </button>
                <button
                  onClick={() => setSidebarView('recent')}
                  className={[
                    'p-1 rounded',
                    sidebarView === 'recent' ? 'bg-[#2a2a2a] text-gray-200' : 'text-gray-500 hover:text-gray-300',
                  ].join(' ')}
                  title="Recent view"
                >
                  <Clock size={12} />
                </button>
              </div>
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
        {sidebarView === 'tree' ? (
          rootPages.map((page) => (
            <div key={page.id} className="group">
              <PageTreeItem
                page={page}
                pages={safePages}
                level={0}
                activePageId={activePageId}
                onSelectPage={onSelectPage}
                onCreatePage={onCreatePage}
                onRequestDelete={handleRequestDelete}
                onContextMenu={handleContextMenu}
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
          ))
        ) : (
          <div className="px-2">
            {recentPages.map((page) => (
              <div
                key={page.id}
                className={[
                  'flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer',
                  page.id === activePageId ? 'bg-[#2a2a2a] text-white' : 'text-gray-300 hover:bg-[#252525]',
                ].join(' ')}
                onClick={() => onSelectPage(page)}
              >
                {page.icon ? (
                  <span className="text-sm shrink-0 w-[14px] text-center">{page.icon}</span>
                ) : (
                  <FileText size={14} className="text-gray-400 shrink-0" />
                )}
                <span className="truncate flex-1">{page.title || 'Untitled'}</span>
                <span className="text-xs text-gray-500 shrink-0">{timeAgo(page.updated_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {safeTrash.length > 0 && (
        <div className="border-t border-[#2f2f2f]">
          <button
            onClick={() => setTrashExpanded((v) => !v)}
            className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide hover:bg-[#252525]"
          >
            {trashExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span>Trash ({safeTrash.length})</span>
          </button>
          {trashExpanded && (
            <div className="py-1 px-2">
              {safeTrash.map((page) => (
                <div
                  key={page.id}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm rounded mx-2 text-gray-400 hover:bg-[#252525]"
                >
                  <FileText size={14} className="text-gray-500 shrink-0" />
                  <span className="truncate flex-1">{page.title || 'Untitled'}</span>
                  <button
                    onClick={() => onRestorePage?.(page.id)}
                    className="p-1 hover:bg-[#333] rounded text-gray-400 hover:text-white"
                    title="Restore"
                  >
                    <RotateCcw size={12} />
                  </button>
                  <button
                    onClick={() => {
                      setConfirmState({
                        title: 'Delete forever',
                        message: `Permanently delete "${page.title || 'Untitled'}"? This cannot be undone.`,
                        onConfirm: () => onPermanentDeletePage?.(page.id),
                      });
                      setConfirmOpen(true);
                    }}
                    className="p-1 hover:bg-red-600/80 rounded text-gray-400 hover:text-white"
                    title="Delete forever"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {contextMenu?.open && contextMenuPage && (
        <div
          ref={contextMenuRef}
          className="fixed bg-[#1e1e1e] border border-[#333] rounded shadow-xl py-1 z-[100] w-44"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-[#2a2a2a] flex items-center gap-2"
            onClick={() => {
              onCreatePage(contextMenuPage.id);
              setContextMenu(null);
            }}
          >
            <Plus size={12} /> New page
          </button>
          <button
            className="w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-[#2a2a2a] flex items-center gap-2"
            onClick={() => {
              onSelectPage(contextMenuPage);
              setContextMenu(null);
            }}
          >
            <FileText size={12} /> Rename
          </button>
          <button
            className="w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-[#2a2a2a] flex items-center gap-2"
            onClick={() => {
              handleDuplicate(contextMenuPage.id);
              setContextMenu(null);
            }}
          >
            <Copy size={12} /> Duplicate
          </button>
          <div className="my-1 border-t border-[#333]" />
          <button
            className="w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-[#2a2a2a] flex items-center gap-2"
            onClick={() => {
              onToggleFavorite?.(contextMenuPage.id, contextMenuPage.is_favorite === 1 ? 0 : 1);
              setContextMenu(null);
            }}
          >
            <Star size={12} /> {contextMenuPage.is_favorite === 1 ? 'Remove from favorites' : 'Add to favorites'}
          </button>
          <div className="my-1 border-t border-[#333]" />
          <button
            className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-red-600/20 flex items-center gap-2"
            onClick={() => {
              setContextMenu(null);
              handleRequestDelete(contextMenuPage);
            }}
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}

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
