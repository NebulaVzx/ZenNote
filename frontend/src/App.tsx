import { useEffect, useState, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { Tabs } from './components/Tabs';
import { Editor } from './components/Editor';
import { SearchModal } from './components/SearchModal';
import { PageSearch } from './components/PageSearch';
import { SettingsModal } from './components/SettingsModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { useToast } from './components/ToastProvider';
import { api } from './api';
import type { Page, Tab } from './types';

function App() {
  const [pages, setPages] = useState<Page[]>([]);
  const [trashPages, setTrashPages] = useState<Page[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activePageId, setActivePageId] = useState<string | undefined>();
  const [searchOpen, setSearchOpen] = useState(false);
  const [pageSearchOpen, setPageSearchOpen] = useState(false);
  const [pageSearchQuery, setPageSearchQuery] = useState('');
  const [pageSearchTotal, setPageSearchTotal] = useState(0);
  const [pageSearchCurrentIndex, setPageSearchCurrentIndex] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [backendOnline, setBackendOnline] = useState(true);
  const [pendingBlockId, setPendingBlockId] = useState<string | null>(null);
  const { success, error: showError } = useToast();
  const pageMap = useRef<Record<string, Page>>({});

  // Load pages
  const refreshPages = useCallback(() => {
    return Promise.all([api.listPages(), api.listTrash()]).then(([data, trash]) => {
      const safeData = Array.isArray(data) ? data : [];
      const safeTrash = Array.isArray(trash) ? trash : [];
      setPages(safeData);
      setTrashPages(safeTrash);
      const map: Record<string, Page> = {};
      safeData.forEach((p) => (map[p.id] = p));
      safeTrash.forEach((p) => (map[p.id] = p));
      pageMap.current = map;
    });
  }, []);

  useEffect(() => {
    refreshPages();
  }, []);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/health', { method: 'GET' });
        setBackendOnline(res.ok);
      } catch {
        setBackendOnline(false);
      }
    };
    checkHealth();
    const id = setInterval(checkHealth, 3000);
    return () => clearInterval(id);
  }, []);

  const openPage = useCallback((pageId: string) => {
    const page = pageMap.current[pageId];
    if (!page) return;
    setTabs((prev) => {
      if (prev.find((t) => t.pageId === pageId)) return prev;
      return [...prev, { pageId, title: page.title }];
    });
    setActivePageId(pageId);
  }, []);

  const createPage = useCallback(
    async (parentId?: string) => {
      const siblings = pages.filter((p) =>
        parentId ? p.parent_id === parentId : !p.parent_id
      );
      const existingTitles = new Set(siblings.map((p) => p.title));
      let title = 'New Page';
      if (existingTitles.has(title)) {
        let counter = 2;
        while (existingTitles.has(`${title} ${counter}`)) {
          counter++;
        }
        title = `${title} ${counter}`;
      }
      const res = await api.createPage(title, parentId);
      await refreshPages();
      openPage(res.id);
    },
    [pages, refreshPages, openPage]
  );

  const closeTab = useCallback(
    (pageId: string) => {
      setTabs((prev) => {
        const idx = prev.findIndex((t) => t.pageId === pageId);
        const next = prev.filter((t) => t.pageId !== pageId);
        if (activePageId === pageId) {
          const newActive = next[idx] || next[idx - 1] || next[0];
          setActivePageId(newActive?.pageId);
        }
        return next;
      });
    },
    [activePageId]
  );

  const updatePageTitle = useCallback(
    async (pageId: string, title: string) => {
      await api.updatePage(pageId, { title });
      await refreshPages();
      setTabs((prev) => prev.map((t) => (t.pageId === pageId ? { ...t, title } : t)));
    },
    [refreshPages]
  );

  const updatePageIcon = useCallback(
    async (pageId: string, icon: string) => {
      const page = pageMap.current[pageId];
      await api.updatePage(pageId, { title: page?.title || '', icon });
      await refreshPages();
    },
    [refreshPages]
  );

  const deletePage = useCallback(
    async (pageId: string) => {
      await api.deletePage(pageId);
      await refreshPages();
      closeTab(pageId);
      success('Page moved to trash');
    },
    [refreshPages, closeTab, success]
  );

  const restorePage = useCallback(
    async (pageId: string) => {
      await api.restorePage(pageId);
      await refreshPages();
      success('Page restored');
    },
    [refreshPages, success]
  );

  const permanentDeletePage = useCallback(
    async (pageId: string) => {
      await api.permanentDeletePage(pageId);
      await refreshPages();
      closeTab(pageId);
      success('Page permanently deleted');
    },
    [refreshPages, closeTab, success]
  );

  const toggleFavoritePage = useCallback(
    async (pageId: string, isFavorite: number) => {
      await api.toggleFavorite(pageId, isFavorite);
      await refreshPages();
    },
    [refreshPages]
  );

  const deletePages = useCallback(
    async (pageIds: string[]) => {
      for (const id of pageIds) {
        await api.deletePage(id);
        closeTab(id);
      }
      await refreshPages();
      success(`${pageIds.length} pages deleted`);
    },
    [refreshPages, closeTab, success]
  );

  // Global shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setPageSearchOpen(true);
      }
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Reset search index when total changes
  useEffect(() => {
    if (pageSearchCurrentIndex >= pageSearchTotal && pageSearchTotal > 0) {
      setPageSearchCurrentIndex(0);
    }
  }, [pageSearchTotal, pageSearchCurrentIndex]);

  const activePage = activePageId ? pageMap.current[activePageId] : undefined;

  const handleReorderPages = async (updated: Page[]) => {
    setPages(updated);
    const map: Record<string, Page> = {};
    updated.forEach((p) => (map[p.id] = p));
    pageMap.current = map;
    try {
      await api.reorderPages(updated);
    } catch (e) {
      console.error('reorder failed', e);
    }
  };

  const handlePageSearchClose = () => {
    setPageSearchOpen(false);
    setPageSearchQuery('');
    setPageSearchCurrentIndex(0);
  };

  const handlePageSearchNext = () => {
    if (pageSearchTotal === 0) return;
    setPageSearchCurrentIndex((prev) => (prev + 1 >= pageSearchTotal ? 0 : prev + 1));
  };

  const handlePageSearchPrev = () => {
    if (pageSearchTotal === 0) return;
    setPageSearchCurrentIndex((prev) => (prev - 1 < 0 ? pageSearchTotal - 1 : prev - 1));
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#191919]">
      <TitleBar onSettings={() => setSettingsOpen(true)} onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <Sidebar
            pages={pages}
            trashPages={trashPages}
            activePageId={activePageId}
            onSelectPage={(p) => openPage(p.id)}
            onCreatePage={createPage}
            onDeletePage={deletePage}
            onDeletePages={deletePages}
            onRestorePage={restorePage}
            onPermanentDeletePage={permanentDeletePage}
            onOpenSearch={() => setSearchOpen(true)}
            onReorderPages={handleReorderPages}
            onToggleFavorite={toggleFavoritePage}
          />
        )}
        <div className="flex-1 flex flex-col min-w-0">
          <Tabs tabs={tabs} activePageId={activePageId} onSwitch={setActivePageId} onClose={closeTab} />
          {pageSearchOpen && (
            <PageSearch
              query={pageSearchQuery}
              onQueryChange={setPageSearchQuery}
              current={pageSearchTotal > 0 ? pageSearchCurrentIndex + 1 : 0}
              total={pageSearchTotal}
              onNext={handlePageSearchNext}
              onPrev={handlePageSearchPrev}
              onClose={handlePageSearchClose}
            />
          )}
          <div className="flex-1 flex flex-col min-h-0">
            {activePage ? (
              <Editor
                pageId={activePage.id}
                title={activePage.title}
                icon={activePage.icon}
                onTitleChange={(t) => updatePageTitle(activePage.id, t)}
                onIconChange={(icon) => updatePageIcon(activePage.id, icon)}
                searchQuery={pageSearchQuery}
                currentSearchIndex={pageSearchCurrentIndex}
                onSearchMatchCountChange={setPageSearchTotal}
                onEditorInput={() => setPageSearchQuery('')}
                jumpToBlockId={pendingBlockId}
                onJumpToBlockDone={() => setPendingBlockId(null)}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                <div className="text-6xl mb-4">📝</div>
                <div className="text-lg font-medium">Welcome to ZenNote</div>
                <div className="text-sm mt-1">Select a page or press Ctrl+P to search</div>
              </div>
            )}
          </div>
        </div>
      </div>
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} onSelect={(pageId, blockId) => { openPage(pageId); setPendingBlockId(blockId); }} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <KeyboardShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {!backendOnline && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center">
          <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-6 max-w-sm w-full text-center shadow-xl">
            <div className="text-lg font-medium text-white mb-2">Backend Disconnected</div>
            <div className="text-sm text-gray-400 mb-4">The local backend is not responding. Please restart it.</div>
            <button
              onClick={async () => {
                try {
                  await invoke('restart_backend');
                } catch (e) {
                  showError(String(e));
                }
              }}
              className="px-4 py-2 bg-[#6366f1] hover:bg-[#4f52c4] text-white rounded text-sm font-medium"
            >
              Restart Backend
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
