import { useEffect, useRef, useState } from 'react';
import { Search, FileText, Clock, X } from 'lucide-react';
import { api } from '../api';
import type { SearchResult } from '../types';

const HISTORY_KEY = 'zennote.searchHistory';
const MAX_HISTORY = 10;

function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || '';
}

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveHistory(history: string[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (pageId: string, blockId: string) => void;
}

export function SearchModal({ isOpen, onClose, onSelect }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [history, setHistory] = useState<string[]>(loadHistory);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setHistory(loadHistory());
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      api
        .search(query)
        .then((res) => {
          setResults(res);
          // 搜索有结果时加入历史
          if (res.length > 0) {
            setHistory((prev) => {
              const next = [query, ...prev.filter((h) => h !== query)].slice(0, MAX_HISTORY);
              saveHistory(next);
              return next;
            });
          }
        })
        .catch(() => setResults([]));
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const removeHistoryItem = (item: string) => {
    setHistory((prev) => {
      const next = prev.filter((h) => h !== item);
      saveHistory(next);
      return next;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[640px] max-w-[90vw] bg-[var(--bg-secondary)] rounded-lg shadow-2xl border border-[var(--border-color)] overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-color)]">
          <Search size={18} className="text-[var(--text-secondary)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索页面和块..."
            className="flex-1 bg-transparent outline-none text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
          />
          <span className="text-xs text-[var(--text-secondary)]">ESC 关闭</span>
        </div>
        <div className="max-h-[50vh] overflow-y-auto">
          {results.length === 0 && query.trim() !== '' && (
            <div className="px-4 py-6 text-sm text-[var(--text-secondary)] text-center">未找到结果</div>
          )}
          {results.length === 0 && query.trim() === '' && history.length > 0 && (
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">最近搜索</span>
                <button
                  onClick={clearHistory}
                  className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  清除全部
                </button>
              </div>
              <div className="space-y-0.5">
                {history.map((item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between group"
                  >
                    <button
                      onClick={() => setQuery(item)}
                      className="flex-1 flex items-center gap-2 px-2 py-1.5 text-sm text-[var(--text-primary)] rounded hover:bg-[var(--bg-tertiary)] text-left"
                    >
                      <Clock size={14} className="text-[var(--text-secondary)]" />
                      <span className="truncate">{item}</span>
                    </button>
                    <button
                      onClick={() => removeHistoryItem(item)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded transition-opacity"
                      title="删除"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {results.length === 0 && query.trim() === '' && history.length === 0 && (
            <div className="px-4 py-6 text-sm text-[var(--text-secondary)] text-center">输入关键词开始搜索</div>
          )}
          {results.map((r, idx) => (
            <button
              key={idx}
              onClick={() => {
                onSelect(r.page_id, r.block_id);
                onClose();
              }}
              className="w-full text-left px-4 py-3 hover:bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] last:border-0"
            >
              <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                <FileText size={14} className="text-[var(--text-secondary)]" />
                <span className="font-medium">{r.page_title}</span>
              </div>
              <div className="mt-1 text-xs text-[var(--text-secondary)] line-clamp-2">
                {stripHtml(r.highlights || r.content)}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
