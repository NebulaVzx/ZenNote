import { useEffect, useRef } from 'react';
import { X, ChevronUp, ChevronDown } from 'lucide-react';

interface PageSearchProps {
  query: string;
  onQueryChange: (q: string) => void;
  current: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

export function PageSearch({ query, onQueryChange, current, total, onNext, onPrev, onClose }: PageSearchProps) {
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
    <div className="zen-search-bar flex items-center gap-2 px-3 py-2 bg-[#252525] border-b border-[#333]">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Find in page..."
        className="flex-1 bg-transparent text-sm text-gray-200 outline-none placeholder-gray-500"
      />
      <span className="text-xs text-gray-500 min-w-[3rem] text-right">
        {total > 0 ? `${current}/${total}` : '0/0'}
      </span>
      <button onClick={onPrev} className="p-1 hover:bg-[#333] rounded text-gray-400">
        <ChevronUp size={14} />
      </button>
      <button onClick={onNext} className="p-1 hover:bg-[#333] rounded text-gray-400">
        <ChevronDown size={14} />
      </button>
      <button onClick={onClose} className="p-1 hover:bg-[#333] rounded text-gray-400">
        <X size={14} />
      </button>
    </div>
  );
}
