import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../api';
import type { Block, BlockType } from '../types';

interface EditorProps {
  pageId: string;
  title: string;
  onTitleChange: (title: string) => void;
}

const PLACEHOLDERS: Record<BlockType, string> = {
  paragraph: "Type '/' for commands",
  heading: 'Heading',
  bullet_list: 'List item',
  numbered_list: 'List item',
  todo_list: 'To-do',
  code: "// Code here",
  toggle: 'Toggle',
  divider: '',
};

const TYPE_ICONS: Record<BlockType, string> = {
  paragraph: '',
  heading: '',
  bullet_list: '•',
  numbered_list: '1.',
  todo_list: '☐',
  code: '',
  toggle: '▶',
  divider: '',
};

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function Editor({ pageId, title, onTitleChange }: EditorProps) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loaded, setLoaded] = useState(false);
  const blockRefs = useRef<(HTMLDivElement | null)[]>([]);
  const saveTimer = useRef<number | null>(null);

  const createEmptyBlock = useCallback((): Block => {
    return {
      id: generateId('block'),
      page_id: pageId,
      type: 'paragraph',
      content: '',
      props: '{}',
      parent_id: '',
      sort_order: 0,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
  }, [pageId]);

  // Load blocks
  useEffect(() => {
    setLoaded(false);
    api.getBlocks(pageId).then((data) => {
      setBlocks(data.length ? data : [createEmptyBlock()]);
      setLoaded(true);
    });
  }, [pageId, createEmptyBlock]);

  // Auto save
  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      api.updateBlocks(pageId, blocks).catch(console.error);
    }, 1500);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [blocks, pageId, loaded]);

  const updateBlock = (idx: number, patch: Partial<Block>) => {
    setBlocks((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch, updated_at: Date.now() };
      return next;
    });
  };

  const insertBlock = (afterIdx: number, type: BlockType = 'paragraph') => {
    setBlocks((prev) => {
      const next = [...prev];
      next.splice(afterIdx + 1, 0, {
        ...createEmptyBlock(),
        type,
      });
      // reassign sort_order
      return next.map((b, i) => ({ ...b, sort_order: i }));
    });
    setTimeout(() => {
      const el = blockRefs.current[afterIdx + 1];
      el?.focus();
      placeCaretAtEnd(el);
    }, 0);
  };

  const removeBlock = (idx: number) => {
    setBlocks((prev) => {
      if (prev.length <= 1) return prev;
      const next = [...prev];
      next.splice(idx, 1);
      return next.map((b, i) => ({ ...b, sort_order: i }));
    });
    setTimeout(() => {
      const targetIdx = Math.max(0, idx - 1);
      const el = blockRefs.current[targetIdx];
      el?.focus();
      placeCaretAtEnd(el);
    }, 0);
  };

  const checkMarkdownShortcut = (idx: number, text: string) => {
    const shortcuts: { prefix: string; type: BlockType; strip: boolean }[] = [
      { prefix: '# ', type: 'heading', strip: true },
      { prefix: '## ', type: 'heading', strip: true },
      { prefix: '- ', type: 'bullet_list', strip: true },
      { prefix: '1. ', type: 'numbered_list', strip: true },
      { prefix: '[] ', type: 'todo_list', strip: true },
      { prefix: '> ', type: 'paragraph', strip: true },
    ];
    for (const s of shortcuts) {
      if (text === s.prefix) {
        updateBlock(idx, { type: s.type, content: s.strip ? '' : text });
        return true;
      }
    }
    if (text.startsWith('```')) {
      updateBlock(idx, { type: 'code', content: '' });
      return true;
    }
    return false;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, idx: number) => {
    const el = blockRefs.current[idx];
    const text = el?.innerText || '';

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (blocks[idx].type === 'code') {
        // insert newline in code
        document.execCommand('insertText', false, '\n');
        updateBlock(idx, { content: el?.innerText || '' });
      } else {
        insertBlock(idx);
      }
      return;
    }

    if (e.key === 'Backspace' && text === '') {
      e.preventDefault();
      removeBlock(idx);
      return;
    }

    if (e.key === 'ArrowUp' && idx > 0) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        const prevEl = blockRefs.current[idx - 1];
        if (prevEl && rect.top <= prevEl.getBoundingClientRect().bottom) {
          e.preventDefault();
          prevEl.focus();
          placeCaretAtEnd(prevEl);
        }
      }
    }
    if (e.key === 'ArrowDown' && idx < blocks.length - 1) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        const nextEl = blockRefs.current[idx + 1];
        if (nextEl && rect.bottom >= nextEl.getBoundingClientRect().top) {
          e.preventDefault();
          nextEl.focus();
          placeCaretAtEnd(nextEl);
        }
      }
    }
  };

  const handleInput = (idx: number) => {
    const el = blockRefs.current[idx];
    const text = el?.innerText || '';
    const wasShortcut = checkMarkdownShortcut(idx, text);
    if (!wasShortcut) {
      updateBlock(idx, { content: text });
    }
  };

  const blockClass = (type: BlockType) => {
    const base = 'py-1.5 px-1 outline-none text-gray-200 zen-editor rounded hover:bg-[#1e1e1e]';
    switch (type) {
      case 'heading':
        return base + ' text-2xl font-semibold';
      case 'code':
        return 'py-2 px-3 outline-none text-sm font-mono bg-[#151515] text-gray-300 rounded border border-[#2f2f2f] whitespace-pre-wrap';
      case 'divider':
        return 'py-2';
      default:
        return base;
    }
  };

  if (!loaded) {
    return <div className="flex-1 p-8 text-gray-500">Loading...</div>;
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto">
      <div className="max-w-[800px] w-full mx-auto px-8 py-10">
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Untitled"
          className="w-full bg-transparent text-4xl font-bold text-gray-100 placeholder-gray-600 outline-none mb-6"
        />
        <div className="space-y-1">
          {blocks.map((block, idx) => (
            <div key={block.id} className="flex items-start gap-2 group">
              {block.type !== 'paragraph' && block.type !== 'heading' && block.type !== 'code' && block.type !== 'divider' && (
                <span className="mt-2 w-6 text-center text-gray-400 select-none shrink-0">
                  {TYPE_ICONS[block.type]}
                </span>
              )}
              {block.type === 'divider' ? (
                <div className="flex-1 py-3">
                  <hr className="border-[#2f2f2f]" />
                </div>
              ) : (
                <div
                  ref={(el) => { blockRefs.current[idx] = el; }}
                  contentEditable
                  suppressContentEditableWarning
                  data-placeholder={PLACEHOLDERS[block.type]}
                  className={['flex-1', blockClass(block.type)].join(' ')}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  onInput={() => handleInput(idx)}
                  onBlur={() => handleInput(idx)}
                >
                  {block.content}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="h-32" />
      </div>
    </div>
  );
}

function placeCaretAtEnd(el: HTMLDivElement | null) {
  if (!el) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    sel.addRange(range);
  }
}
