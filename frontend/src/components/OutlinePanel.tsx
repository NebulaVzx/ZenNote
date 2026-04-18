import { useEffect, useRef, useState } from 'react';
import type { Block } from '../types';

interface OutlineItem {
  id: string;
  level: number;
  text: string;
}

interface OutlinePanelProps {
  blocks: Block[];
  containerRef: React.RefObject<HTMLDivElement | null>;
}

function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || '';
}

export function OutlinePanel({ blocks, containerRef }: OutlinePanelProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const itemsRef = useRef<HTMLDivElement>(null);

  const items: OutlineItem[] = blocks
    .filter((b) => b.type === 'heading')
    .map((b) => {
      const props = JSON.parse(b.props || '{}');
      return {
        id: b.id,
        level: props.level || 1,
        text: stripHtml(b.content) || `Heading ${props.level || 1}`,
      };
    });

  if (items.length === 0) return null;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible heading
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        root: container,
        threshold: 0,
        rootMargin: '-10% 0px -80% 0px',
      }
    );

    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items, containerRef]);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const levelPadding: Record<number, string> = {
    1: 'pl-2',
    2: 'pl-5',
    3: 'pl-8',
  };

  const levelSize: Record<number, string> = {
    1: 'text-xs font-medium',
    2: 'text-xs',
    3: 'text-[11px]',
  };

  return (
    <div
      ref={itemsRef}
      className="w-48 flex-shrink-0 border-l border-[#2a2a2a] bg-[#1a1a1a] overflow-y-auto py-4 select-none"
    >
      <div className="px-3 mb-2 text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
        Outline
      </div>
      <div className="space-y-0.5">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => handleClick(item.id)}
            className={[
              'w-full text-left truncate rounded px-2 py-1 transition-colors',
              levelPadding[item.level] || 'pl-2',
              levelSize[item.level] || 'text-xs',
              activeId === item.id
                ? 'text-blue-400 bg-[#2a2a2a]'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#222]',
            ].join(' ')}
            title={item.text}
          >
            {item.text}
          </button>
        ))}
      </div>
    </div>
  );
}
