import { useEffect, useRef } from 'react';
import { X, ChevronUp, ChevronDown, Replace } from 'lucide-react';

interface PageSearchProps {
  query: string;
  onQueryChange: (q: string) => void;
  replaceQuery: string;
  onReplaceChange: (q: string) => void;
  current: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  onReplace: () => void;
  onReplaceAll: () => void;
}

export function PageSearch({
  query,
  onQueryChange,
  replaceQuery,
  onReplaceChange,
  current,
  total,
  onNext,
  onPrev,
  onClose,
  onReplace,
  onReplaceAll,
}: PageSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) onPrev();
        else onNext();
      } else if (e.key === 'F3') {
        e.preventDefault();
        if (e.shiftKey) onPrev();
        else onNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNext, onPrev, onClose]);

  return (
    <div className="bg-[#252525] border-b border-[#333]">
      <div className="flex items-center gap-2 px-3 py-2">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="查找..."
          className="flex-1 bg-transparent text-sm text-gray-200 outline-none placeholder-gray-500"
        />
        <span className="text-xs text-gray-500 min-w-[3rem] text-right">
          {total > 0 ? `${current}/${total}` : '0/0'}
        </span>
        <button onClick={onPrev} className="p-1 hover:bg-[#333] rounded text-gray-400" title="上一个">
          <ChevronUp size={14} />
        </button>
        <button onClick={onNext} className="p-1 hover:bg-[#333] rounded text-gray-400" title="下一个">
          <ChevronDown size={14} />
        </button>
        <button onClick={onClose} className="p-1 hover:bg-[#333] rounded text-gray-400" title="关闭">
          <X size={14} />
        </button>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border-t border-[#2a2a2a]">
        <Replace size={14} className="text-gray-500" />
        <input
          value={replaceQuery}
          onChange={(e) => onReplaceChange(e.target.value)}
          placeholder="替换为..."
          className="flex-1 bg-transparent text-sm text-gray-200 outline-none placeholder-gray-500"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onReplace();
            }
          }}
        />
        <button
          onClick={onReplace}
          disabled={!query.trim() || total === 0}
          className="px-2 py-1 text-xs bg-[#2a2a2a] hover:bg-[#333] text-gray-300 rounded disabled:opacity-40 disabled:cursor-not-allowed"
        >
          替换
        </button>
        <button
          onClick={onReplaceAll}
          disabled={!query.trim()}
          className="px-2 py-1 text-xs bg-[#2a2a2a] hover:bg-[#333] text-gray-300 rounded disabled:opacity-40 disabled:cursor-not-allowed"
        >
          全部替换
        </button>
      </div>
    </div>
  );
}
