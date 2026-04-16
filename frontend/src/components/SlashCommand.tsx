import { useEffect, useRef, useState } from 'react';
import { Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, Code, SquareChevronDown, Minus, Type, Sparkles, Quote } from 'lucide-react';
import type { BlockType } from '../types';

export interface SlashItem {
  label: string;
  icon: React.ReactNode;
  type: BlockType;
  keywords: string[];
}

const ITEMS: SlashItem[] = [
  { label: 'Heading 1', icon: <Heading1 size={16} />, type: 'heading', keywords: ['h1', 'heading'] },
  { label: 'Heading 2', icon: <Heading2 size={16} />, type: 'heading', keywords: ['h2'] },
  { label: 'Heading 3', icon: <Heading3 size={16} />, type: 'heading', keywords: ['h3'] },
  { label: 'Bullet List', icon: <List size={16} />, type: 'bullet_list', keywords: ['list', 'ul'] },
  { label: 'Numbered List', icon: <ListOrdered size={16} />, type: 'numbered_list', keywords: ['num', 'ol', 'ordered'] },
  { label: 'To-do List', icon: <CheckSquare size={16} />, type: 'todo_list', keywords: ['todo', 'check'] },
  { label: 'Quote', icon: <Quote size={16} />, type: 'quote', keywords: ['quote'] },
  { label: 'Code Block', icon: <Code size={16} />, type: 'code', keywords: ['code'] },
  { label: 'Toggle', icon: <SquareChevronDown size={16} />, type: 'toggle', keywords: ['toggle'] },
  { label: 'Divider', icon: <Minus size={16} />, type: 'divider', keywords: ['divider', 'hr'] },
  { label: 'Paragraph', icon: <Type size={16} />, type: 'paragraph', keywords: ['text', 'p'] },
  { label: 'AI Assist', icon: <Sparkles size={16} />, type: 'paragraph', keywords: ['ai'] },
];

interface SlashCommandProps {
  query: string;
  onSelect: (item: SlashItem) => void;
  onClose: () => void;
}

export function SlashCommand({ query, onSelect, onClose }: SlashCommandProps) {
  const filtered = ITEMS.filter((item) =>
    item.keywords.some((k) => k.includes(query.toLowerCase())) ||
    item.label.toLowerCase().includes(query.toLowerCase())
  );
  const [selected, setSelected] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected((i) => (i + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = filtered[selected];
        if (item) onSelect(item);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filtered, onSelect, onClose, selected]);

  useEffect(() => {
    const el = containerRef.current?.children[selected] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  if (filtered.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="absolute z-50 w-56 bg-[#252525] border border-[#333] rounded-md shadow-xl overflow-y-auto max-h-72 py-1"
    >
      {filtered.map((item, idx) => (
        <button
          key={item.label}
          onClick={() => onSelect(item)}
          className={[
            'w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors',
            idx === selected ? 'bg-[#3b82f6] text-white' : 'text-gray-200 hover:bg-[#333]',
          ].join(' ')}
        >
          <span className="text-gray-400">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
