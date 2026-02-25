import { useEffect, useRef, useState } from 'react';
import { X, ChevronUp, ChevronDown } from 'lucide-react';

interface PageSearchProps {
  isOpen: boolean;
  onClose: () => void;
  containerRef: React.RefObject<HTMLElement>;
}

export function PageSearch({ isOpen, onClose, containerRef }: PageSearchProps) {
  const [query, setQuery] = useState('');
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      clearHighlights();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) prevMatch();
        else nextMatch();
      } else if (e.key === 'F3') {
        e.preventDefault();
        if (e.shiftKey) prevMatch();
        else nextMatch();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    clearHighlights();
    if (!query.trim()) {
      setTotal(0);
      setCurrent(0);
      return;
    }
    const t = setTimeout(() => {
      highlightAll(query);
    }, 100);
    return () => clearTimeout(t);
  }, [query, isOpen]);

  const clearHighlights = () => {
    const container = containerRef.current;
    if (!container) return;
    container.querySelectorAll('mark.zen-search-highlight').forEach((el) => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ''), el);
        parent.normalize();
      }
    });
  };

  const highlightAll = (q: string) => {
    const container = containerRef.current;
    if (!container) return;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        if (node.parentElement?.closest('.zen-search-bar')) return NodeFilter.FILTER_REJECT;
        if (node.parentElement?.tagName === 'MARK') return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);

    nodes.forEach((node) => {
      const text = node.textContent || '';
      const lower = text.toLowerCase();
      const idx = lower.indexOf(q.toLowerCase());
      if (idx !== -1) {
        const span = document.createElement('mark');
        span.className = 'zen-search-highlight bg-yellow-600/70 text-white rounded px-0.5';
        const range = document.createRange();
        range.setStart(node, idx);
        range.setEnd(node, idx + q.length);
        try {
          range.surroundContents(span);
        } catch {
          // cross-boundary ignore
        }
      }
    });

    const marks = Array.from(container.querySelectorAll('mark.zen-search-highlight'));
    setTotal(marks.length);
    setCurrent(marks.length > 0 ? 1 : 0);
    if (marks.length > 0) scrollTo(0);
  };

  const scrollTo = (idx: number) => {
    const container = containerRef.current;
    if (!container) return;
    const marks = Array.from(container.querySelectorAll('mark.zen-search-highlight'));
    marks.forEach((m, i) => {
      (m as HTMLElement).style.backgroundColor = i === idx ? '#f59e0b' : '';
      (m as HTMLElement).style.color = i === idx ? '#000' : '';
    });
    const el = marks[idx] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const nextMatch = () => {
    if (total === 0) return;
    const next = (current % total);
    setCurrent(next + 1);
    scrollTo(next);
  };

  const prevMatch = () => {
    if (total === 0) return;
    const prev = ((current - 2 + total) % total);
    setCurrent(prev + 1);
    scrollTo(prev);
  };

  if (!isOpen) return null;

  return (
    <div className="zen-search-bar flex items-center gap-2 px-3 py-2 bg-[#252525] border-b border-[#333]">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Find in page..."
        className="flex-1 bg-transparent text-sm text-gray-200 outline-none placeholder-gray-500"
      />
      <span className="text-xs text-gray-500 min-w-[3rem] text-right">
        {total > 0 ? `${current}/${total}` : '0/0'}
      </span>
      <button onClick={prevMatch} className="p-1 hover:bg-[#333] rounded text-gray-400">
        <ChevronUp size={14} />
      </button>
      <button onClick={nextMatch} className="p-1 hover:bg-[#333] rounded text-gray-400">
        <ChevronDown size={14} />
      </button>
      <button onClick={onClose} className="p-1 hover:bg-[#333] rounded text-gray-400">
        <X size={14} />
      </button>
    </div>
  );
}
