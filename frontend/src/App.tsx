import { useEffect, useState, useCallback, useRef } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { Tabs } from './components/Tabs';
import { Editor } from './components/Editor';
import { SearchModal } from './components/SearchModal';
import { PageSearch } from './components/PageSearch';
import { SettingsModal } from './components/SettingsModal';
import { api } from './api';
import type { Page, Tab } from './types';

function App() {
  const [pages, setPages] = useState<Page[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activePageId, setActivePageId] = useState<string | undefined>();
  const [searchOpen, setSearchOpen] = useState(false);
  const [pageSearchOpen, setPageSearchOpen] = useState(false);
  const [pageSearchQuery, setPageSearchQuery] = useState('');
  const [pageSearchTotal, setPageSearchTotal] = useState(0);
  const [pageSearchCurrentIndex, setPageSearchCurrentIndex] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pageMap = useRef<Record<string, Page>>({});

  // Load pages
  const refreshPages = useCallback(() => {
    return api.listPages().then((data) => {
      const safeData = Array.isArray(data) ? data : [];
      setPages(safeData);
      const map: Record<string, Page> = {};
      safeData.forEach((p) => (map[p.id] = p));
      pageMap.current = map;
    });
  }, []);

  useEffect(() => {
    refreshPages();
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
      const res = await api.createPage('New Page', parentId);
      await refreshPages();
      openPage(res.id);
    },
    [refreshPages, openPage]
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
      await api.updatePage(pageId, title);
      await refreshPages();
      setTabs((prev) => prev.map((t) => (t.pageId === pageId ? { ...t, title } : t)));
    },
    [refreshPages]
  );

  const deletePage = useCallback(
    async (pageId: string) => {
      await api.deletePage(pageId);
      await refreshPages();
      closeTab(pageId);
    },
    [refreshPages, closeTab]
  );

  const deletePages = useCallback(
    async (pageIds: string[]) => {
      for (const id of pageIds) {
        await api.deletePage(id);
        closeTab(id);
      }
      await refreshPages();
    },
    [refreshPages, closeTab]
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
      <TitleBar onSettings={() => setSettingsOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          pages={pages}
          activePageId={activePageId}
          onSelectPage={(p) => openPage(p.id)}
          onCreatePage={createPage}
          onDeletePage={deletePage}
          onDeletePages={deletePages}
          onOpenSearch={() => setSearchOpen(true)}
          onReorderPages={handleReorderPages}
        />
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
                onTitleChange={(t) => updatePageTitle(activePage.id, t)}
                searchQuery={pageSearchQuery}
                currentSearchIndex={pageSearchCurrentIndex}
                onSearchMatchCountChange={setPageSearchTotal}
                onEditorInput={() => setPageSearchQuery('')}
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
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} onSelect={(id) => openPage(id)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export default App;
