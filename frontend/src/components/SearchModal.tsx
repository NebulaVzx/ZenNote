import { useEffect, useRef, useState } from 'react';
import { Search, FileText } from 'lucide-react';
import { api } from '../api';
import type { SearchResult } from '../types';

function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || '';
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (pageId: string, blockId: string) => void;
}

export function SearchModal({ isOpen, onClose, onSelect }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      api.search(query).then(setResults).catch(() => setResults([]));
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[640px] max-w-[90vw] bg-[#202020] rounded-lg shadow-2xl border border-[#2f2f2f] overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2f2f2f]">
          <Search size={18} className="text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages and blocks..."
            className="flex-1 bg-transparent outline-none text-gray-200 placeholder-gray-500"
          />
          <span className="text-xs text-gray-500">ESC to close</span>
        </div>
        <div className="max-h-[50vh] overflow-y-auto">
          {results.length === 0 && query.trim() !== '' && (
            <div className="px-4 py-6 text-sm text-gray-500 text-center">No results found</div>
          )}
          {results.length === 0 && query.trim() === '' && (
            <div className="px-4 py-6 text-sm text-gray-500 text-center">Type to search</div>
          )}
          {results.map((r, idx) => (
            <button
              key={idx}
              onClick={() => {
                onSelect(r.page_id, r.block_id);
                onClose();
              }}
              className="w-full text-left px-4 py-3 hover:bg-[#2a2a2a] border-b border-[#2a2a2a] last:border-0"
            >
              <div className="flex items-center gap-2 text-sm text-gray-200">
                <FileText size={14} className="text-gray-400" />
                <span className="font-medium">{r.page_title}</span>
              </div>
              <div className="mt-1 text-xs text-gray-400 line-clamp-2">
                {stripHtml(r.highlights || r.content)}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
