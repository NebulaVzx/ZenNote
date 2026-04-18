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
import { WelcomeScreen, createTemplateBlocks } from './components/WelcomeScreen';
import { useToast } from './components/ToastProvider';
import { api } from './api';
import { parseMarkdown, generateMarkdown } from './utils/markdown';
import { generatePageHTML } from './utils/export';
import { save } from '@tauri-apps/plugin-dialog';
import type { Page, Tab } from './types';

function App() {
  const [pages, setPages] = useState<Page[]>([]);
  const [trashPages, setTrashPages] = useState<Page[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activePageId, setActivePageId] = useState<string | undefined>();
  const [searchOpen, setSearchOpen] = useState(false);
  const [pageSearchOpen, setPageSearchOpen] = useState(false);
  const [pageSearchQuery, setPageSearchQuery] = useState('');
  const [pageSearchReplaceQuery, setPageSearchReplaceQuery] = useState('');
  const [pageSearchTotal, setPageSearchTotal] = useState(0);
  const [pageSearchCurrentIndex, setPageSearchCurrentIndex] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pendingBlockId, setPendingBlockId] = useState<string | null>(null);
  const [hasLaunched, setHasLaunched] = useState<boolean>(() => {
    try {
      return localStorage.getItem('zennote.hasLaunched') === 'true';
    } catch {
      return true;
    }
  });
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    try {
      return (localStorage.getItem('zennote.theme') as 'light' | 'dark' | 'system') || 'dark';
    } catch {
      return 'dark';
    }
  });
  const { success, error: showError } = useToast();
  const pageMap = useRef<Record<string, Page>>({});

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
      root.classList.toggle('light', !prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
      root.classList.toggle('light', theme === 'light');
    }
    try {
      localStorage.setItem('zennote.theme', theme);
    } catch {}
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', e.matches);
      document.documentElement.classList.toggle('light', !e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  // Load pages
  const refreshPages = useCallback(() => {
    return Promise.all([
      api.listPages().catch(() => [] as Page[]),
      api.listTrash().catch(() => [] as Page[]),
    ]).then(([data, trash]) => {
      const safeData = Array.isArray(data) ? data : [];
      const safeTrash = Array.isArray(trash) ? trash : [];
      setPages(safeData);
      setTrashPages(safeTrash);
      const map: Record<string, Page> = {};
      safeData.forEach((p) => (map[p.id] = p));
      safeTrash.forEach((p) => (map[p.id] = p));
      pageMap.current = map;
      return safeData.length;
    });
  }, []);

  // Mount-time data polling: try to load pages immediately and retry every
  // second until data arrives. This is completely independent of the health
  // check so that even if backendOnline state transitions are missed or
  // delayed, the sidebar will still populate as soon as the API is reachable.
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    let attemptCount = 0;
    const MAX_ATTEMPTS = 60; // 60 seconds max

    const tryLoad = async () => {
      if (cancelled) return;
      attemptCount++;
      try {
        const count = await refreshPages();
        if (!cancelled && count === 0 && attemptCount < MAX_ATTEMPTS) {
          timeoutId = setTimeout(tryLoad, 1000);
        }
      } catch {
        // refreshPages already catches internally, but be safe
        if (!cancelled && attemptCount < MAX_ATTEMPTS) {
          timeoutId = setTimeout(tryLoad, 1000);
        }
      }
    };

    tryLoad();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
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
    async (parentId?: string, title?: string, filePath?: string, frontmatter?: string) => {
      const targetTitle = title || 'New Page';
      const siblings = pages.filter((p) =>
        parentId ? p.parent_id === parentId : !p.parent_id
      );
      const existingTitles = new Set(siblings.map((p) => p.title));
      let finalTitle = targetTitle;
      if (existingTitles.has(finalTitle)) {
        let counter = 2;
        while (existingTitles.has(`${finalTitle} ${counter}`)) {
          counter++;
        }
        finalTitle = `${finalTitle} ${counter}`;
      }
      const res = await api.createPage(finalTitle, parentId, filePath, frontmatter);
      await refreshPages();
      openPage(res.id);
      return res.id;
    },
    [pages, refreshPages, openPage]
  );

  const handleOpenMarkdownFile = useCallback(async () => {
    try {
      const result = await invoke<[content: string, filePath: string] | null>('open_markdown_file');
      if (!result) return;
      const [content, filePath] = result;
      const { frontmatter, blocks } = parseMarkdown(content, '');
      const title = frontmatter.title || filePath.split(/[\\/]/).pop()?.replace(/\.md$/i, '') || 'Imported Page';
      const pageId = await createPage(undefined, title, filePath, JSON.stringify(frontmatter));
      // Update blocks for the new page
      await api.updateBlocks(pageId, blocks.map((b, i) => ({ ...b, page_id: pageId, sort_order: i })));
      success(`Opened "${title}"`);
    } catch (e: any) {
      showError(e.message || 'Failed to open markdown file');
    }
  }, [createPage, success, showError]);

  const handleExportMarkdown = useCallback(async () => {
    if (!activePageId) return;
    try {
      const blocks = await api.getBlocks(activePageId);
      const page = pageMap.current[activePageId];
      const frontmatter: Record<string, any> = {};
      if (page?.frontmatter) {
        try { Object.assign(frontmatter, JSON.parse(page.frontmatter)); } catch {}
      }
      frontmatter.title = page?.title || 'Untitled';
      if (page?.icon) frontmatter.icon = page.icon;
      const md = generateMarkdown(blocks, frontmatter);
      await invoke('save_markdown_file', { filePath: `${page?.title || 'Untitled'}.md`, content: md });
      success('Exported to Markdown');
    } catch (e: any) {
      showError(e.message || 'Failed to export markdown');
    }
  }, [activePageId, success, showError]);

  const handleExportHTML = useCallback(async () => {
    if (!activePageId) return;
    try {
      const blocks = await api.getBlocks(activePageId);
      const page = pageMap.current[activePageId];
      if (!page) return;
      const html = generatePageHTML(page, blocks);
      const filePath = await save({
        filters: [{ name: 'HTML', extensions: ['html'] }],
        defaultPath: `${page.title || 'Untitled'}.html`,
      });
      if (!filePath) return;
      await invoke('save_markdown_file', { filePath, content: html });
      success('Exported to HTML');
    } catch (e: any) {
      showError(e.message || 'Failed to export HTML');
    }
  }, [activePageId, success, showError]);

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
      if (e.ctrlKey && e.key.toLowerCase() === 'h') {
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

  const editorReplaceRef = useRef<((query: string, replacement: string, all: boolean) => void) | null>(null);

  const handlePageSearchClose = () => {
    setPageSearchOpen(false);
    setPageSearchQuery('');
    setPageSearchReplaceQuery('');
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

  const handleReplace = () => {
    if (!pageSearchQuery.trim() || !editorReplaceRef.current) return;
    editorReplaceRef.current(pageSearchQuery, pageSearchReplaceQuery, false);
  };

  const handleReplaceAll = () => {
    if (!pageSearchQuery.trim() || !editorReplaceRef.current) return;
    editorReplaceRef.current(pageSearchQuery, pageSearchReplaceQuery, true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    e.preventDefault();

    for (const file of files) {
      if (file.name.endsWith('.md')) {
        const text = await file.text();
        const { frontmatter, blocks } = parseMarkdown(text, '');
        const title = frontmatter.title || file.name.replace(/\.md$/i, '');
        const pageId = await createPage(undefined, title, undefined, JSON.stringify(frontmatter));
        await api.updateBlocks(pageId, blocks.map((b, i) => ({ ...b, page_id: pageId, sort_order: i })));
        success(`Opened "${title}"`);
      }
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[var(--bg-primary)]" onDragOver={handleDragOver} onDrop={handleDrop}>
      <TitleBar
        onSettings={() => setSettingsOpen(true)}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onOpenMarkdown={handleOpenMarkdownFile}
        onExportMarkdown={handleExportMarkdown}
        onExportHTML={handleExportHTML}
      />
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
              replaceQuery={pageSearchReplaceQuery}
              onReplaceChange={setPageSearchReplaceQuery}
              current={pageSearchTotal > 0 ? pageSearchCurrentIndex + 1 : 0}
              total={pageSearchTotal}
              onNext={handlePageSearchNext}
              onPrev={handlePageSearchPrev}
              onClose={handlePageSearchClose}
              onReplace={handleReplace}
              onReplaceAll={handleReplaceAll}
            />
          )}
          <div className="flex-1 flex flex-col min-h-0">
            {activePage ? (
              <Editor
                pageId={activePage.id}
                title={activePage.title}
                icon={activePage.icon}
                filePath={activePage.file_path}
                frontmatter={activePage.frontmatter}
                onTitleChange={(t) => updatePageTitle(activePage.id, t)}
                onIconChange={(icon) => updatePageIcon(activePage.id, icon)}
                searchQuery={pageSearchQuery}
                currentSearchIndex={pageSearchCurrentIndex}
                onSearchMatchCountChange={setPageSearchTotal}
                onEditorInput={() => setPageSearchQuery('')}
                jumpToBlockId={pendingBlockId}
                onJumpToBlockDone={() => setPendingBlockId(null)}
                onReplaceRef={(fn) => { editorReplaceRef.current = fn; }}
              />
            ) : !hasLaunched ? (
              <WelcomeScreen
                onSelectTemplate={async (templateKey) => {
                  const pageId = await createPage(undefined, '未命名页面');
                  if (pageId) {
                    const blocks = createTemplateBlocks(templateKey, pageId);
                    await api.updateBlocks(pageId, blocks.map((b, i) => ({ ...b, sort_order: i })));
                    await refreshPages();
                    openPage(pageId);
                  }
                  localStorage.setItem('zennote.hasLaunched', 'true');
                  setHasLaunched(true);
                }}
                onSkip={() => {
                  localStorage.setItem('zennote.hasLaunched', 'true');
                  setHasLaunched(true);
                }}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-secondary)]">
                <div className="text-6xl mb-4">📝</div>
                <div className="text-lg font-medium text-[var(--text-primary)]">欢迎使用 ZenNote</div>
                <div className="text-sm mt-1">选择一个页面或按 Ctrl+P 搜索</div>
              </div>
            )}
          </div>
        </div>
      </div>
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} onSelect={(pageId, blockId) => { openPage(pageId); setPendingBlockId(blockId); }} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} activePageId={activePageId} theme={theme} onThemeChange={setTheme} />
      <KeyboardShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}

export default App;
