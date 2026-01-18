import { useEffect, useState, useCallback, useRef } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { Tabs } from './components/Tabs';
import { Editor } from './components/Editor';
import { SearchModal } from './components/SearchModal';
import { api } from './api';
import type { Page, Tab } from './types';

function App() {
  const [pages, setPages] = useState<Page[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activePageId, setActivePageId] = useState<string | undefined>();
  const [searchOpen, setSearchOpen] = useState(false);
  const pageMap = useRef<Record<string, Page>>({});

  // Load pages
  const refreshPages = useCallback(() => {
    api.listPages().then((data) => {
      setPages(data);
      const map: Record<string, Page> = {};
      data.forEach((p) => (map[p.id] = p));
      pageMap.current = map;
    });
  }, []);

  useEffect(() => {
    refreshPages();
  }, [refreshPages]);

  const openPage = useCallback(
    (pageId: string) => {
      const page = pageMap.current[pageId];
      if (!page) return;
      setTabs((prev) => {
        if (prev.find((t) => t.pageId === pageId)) return prev;
        return [...prev, { pageId, title: page.title }];
      });
      setActivePageId(pageId);
    },
    []
  );

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
      setTabs((prev) =>
        prev.map((t) => (t.pageId === pageId ? { ...t, title } : t))
      );
    },
    [refreshPages]
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
        // TODO: page find
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const activePage = activePageId ? pageMap.current[activePageId] : undefined;

  return (
    <div className="flex flex-col h-full w-full bg-[#191919]">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          pages={pages}
          activePageId={activePageId}
          onSelectPage={(p) => openPage(p.id)}
          onCreatePage={createPage}
          onOpenSearch={() => setSearchOpen(true)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <Tabs
            tabs={tabs}
            activePageId={activePageId}
            onSwitch={setActivePageId}
            onClose={closeTab}
          />
          {activePage ? (
            <Editor
              pageId={activePage.id}
              title={activePage.title}
              onTitleChange={(t) => updatePageTitle(activePage.id, t)}
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
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(id) => openPage(id)}
      />
    </div>
  );
}

export default App;
