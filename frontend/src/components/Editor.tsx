import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../api';
import { SlashCommand, type SlashItem } from './SlashCommand';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
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
  code: '// Code here',
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
  const editorRef = useRef<HTMLDivElement>(null);

  // Slash command state
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashIdx, setSlashIdx] = useState(0);
  const slashPos = useRef<{ left: number; top: number }>({ left: 0, top: 0 });

  // Floating toolbar state
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ left: 0, top: 0 });

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

  // Highlight code blocks after render
  useEffect(() => {
    if (!loaded) return;
    editorRef.current?.querySelectorAll('pre code').forEach((el) => {
      hljs.highlightElement(el as HTMLElement);
    });
  }, [blocks, loaded]);

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
      next.splice(afterIdx + 1, 0, { ...createEmptyBlock(), type });
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

  const getBlockText = (idx: number) => blockRefs.current[idx]?.innerText || '';

  const checkMarkdownShortcut = (idx: number, text: string) => {
    if (text === '# ') {
      updateBlock(idx, { type: 'heading', content: '', props: JSON.stringify({ level: 1 }) });
      return true;
    }
    if (text === '## ') {
      updateBlock(idx, { type: 'heading', content: '', props: JSON.stringify({ level: 2 }) });
      return true;
    }
    if (text === '- ') {
      updateBlock(idx, { type: 'bullet_list', content: '' });
      return true;
    }
    if (text === '1. ') {
      updateBlock(idx, { type: 'numbered_list', content: '' });
      return true;
    }
    if (text === '[] ') {
      updateBlock(idx, { type: 'todo_list', content: '' });
      return true;
    }
    if (text === '> ') {
      updateBlock(idx, { type: 'paragraph', content: '' });
      return true;
    }
    if (text.startsWith('```')) {
      const lang = text.slice(3).trim();
      updateBlock(idx, { type: 'code', content: '', props: JSON.stringify({ language: lang || 'text' }) });
      return true;
    }
    return false;
  };

  const showSlashCommand = (idx: number) => {
    const el = blockRefs.current[idx];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const editorRect = editorRef.current?.getBoundingClientRect();
    if (!editorRect) return;
    slashPos.current = {
      left: rect.left - editorRect.left,
      top: rect.bottom - editorRect.top + 4,
    };
    setSlashIdx(idx);
    setSlashQuery('');
    setSlashOpen(true);
  };

  const handleSlashSelect = (item: SlashItem) => {
    setSlashOpen(false);
    const idx = slashIdx;
    if (item.type === 'divider') {
      updateBlock(idx, { type: 'divider', content: '' });
    } else if (item.type === 'code') {
      updateBlock(idx, { type: 'code', content: '', props: JSON.stringify({ language: 'typescript' }) });
    } else if (item.type === 'toggle') {
      updateBlock(idx, { type: 'toggle', content: '' });
    } else if (item.label === 'Heading 1') {
      updateBlock(idx, { type: 'heading', props: JSON.stringify({ level: 1 }) });
    } else if (item.label === 'Heading 2') {
      updateBlock(idx, { type: 'heading', props: JSON.stringify({ level: 2 }) });
    } else {
      updateBlock(idx, { type: item.type });
    }
    setTimeout(() => {
      const el = blockRefs.current[idx];
      el?.focus();
      placeCaretAtEnd(el);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, idx: number) => {
    const el = blockRefs.current[idx];
    const text = getBlockText(idx);

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (slashOpen) return;
      if (blocks[idx].type === 'code') {
        document.execCommand('insertText', false, '\n');
        updateBlock(idx, { content: el?.innerText || '' });
      } else {
        insertBlock(idx);
      }
      return;
    }

    if (e.key === 'Backspace' && text === '') {
      e.preventDefault();
      if (slashOpen) setSlashOpen(false);
      removeBlock(idx);
      return;
    }

    if (e.key === 'Escape') {
      setSlashOpen(false);
      setToolbarVisible(false);
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

    // slash command detection
    if (text === '/') {
      showSlashCommand(idx);
      return;
    }
    if (slashOpen) {
      if (text.startsWith('/')) {
        setSlashQuery(text.slice(1));
        return;
      } else {
        setSlashOpen(false);
      }
    }

    const wasShortcut = checkMarkdownShortcut(idx, text);
    if (!wasShortcut) {
      updateBlock(idx, { content: text });
    }
  };

  const handleMouseUp = () => {
    const sel = window.getSelection();
    const text = sel?.toString() || '';
    if (text.length > 0) {
      const range = sel!.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const editorRect = editorRef.current?.getBoundingClientRect();
      if (editorRect) {
        setToolbarPos({ left: rect.left - editorRect.left + rect.width / 2 - 60, top: rect.top - editorRect.top - 40 });
        setToolbarVisible(true);
      }
    } else {
      setToolbarVisible(false);
    }
  };

  const applyInlineFormat = (tag: string) => {
    document.execCommand(tag, false);
    setToolbarVisible(false);
  };

  const blockClass = (type: BlockType) => {
    const base = 'py-1.5 px-1 outline-none text-gray-200 zen-editor rounded hover:bg-[#1e1e1e]';
    switch (type) {
      case 'heading':
        return base + ' text-2xl font-semibold';
      case 'code':
        return 'hidden'; // rendered via pre/code
      case 'divider':
        return 'py-2';
      default:
        return base;
    }
  };

  const toggleExpand = (idx: number) => {
    const props = JSON.parse(blocks[idx].props || '{}');
    updateBlock(idx, { props: JSON.stringify({ ...props, expanded: !props.expanded }) });
  };

  if (!loaded) {
    return <div className="flex-1 p-8 text-gray-500">Loading...</div>;
  }

  return (
    <div ref={editorRef} className="flex-1 flex flex-col h-full overflow-y-auto relative" onMouseUp={handleMouseUp}>
      {slashOpen && (
        <div style={{ left: slashPos.current.left, top: slashPos.current.top, position: 'absolute' }}>
          <SlashCommand query={slashQuery} onSelect={handleSlashSelect} onClose={() => setSlashOpen(false)} />
        </div>
      )}
      {toolbarVisible && (
        <div
          style={{ left: toolbarPos.left, top: toolbarPos.top, position: 'absolute' }}
          className="flex items-center gap-1 px-2 py-1 bg-[#2a2a2a] border border-[#444] rounded shadow-lg"
        >
          <button onClick={() => applyInlineFormat('bold')} className="px-2 py-0.5 text-sm font-bold text-gray-200 hover:bg-[#333] rounded">B</button>
          <button onClick={() => applyInlineFormat('italic')} className="px-2 py-0.5 text-sm italic text-gray-200 hover:bg-[#333] rounded">I</button>
          <button onClick={() => applyInlineFormat('strikeThrough')} className="px-2 py-0.5 text-sm line-through text-gray-200 hover:bg-[#333] rounded">S</button>
          <button onClick={() => applyInlineFormat('removeFormat')} className="px-2 py-0.5 text-sm text-gray-400 hover:bg-[#333] rounded">✕</button>
        </div>
      )}
      <div className="max-w-[800px] w-full mx-auto px-8 py-10">
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Untitled"
          className="w-full bg-transparent text-4xl font-bold text-gray-100 placeholder-gray-600 outline-none mb-6"
        />
        <div className="space-y-1">
          {blocks.map((block, idx) => {
            const props = JSON.parse(block.props || '{}');
            if (block.type === 'toggle') {
              return (
                <div key={block.id} className="flex items-start gap-2 group">
                  <button onClick={() => toggleExpand(idx)} className="mt-2 w-6 text-center text-gray-400 select-none shrink-0 hover:text-gray-200">
                    {props.expanded ? '▼' : '▶'}
                  </button>
                  <div className="flex-1">
                    <div
                      ref={(el) => { blockRefs.current[idx] = el; }}
                      contentEditable
                      suppressContentEditableWarning
                      data-placeholder={PLACEHOLDERS.toggle}
                      className="py-1.5 px-1 outline-none text-gray-200 zen-editor rounded hover:bg-[#1e1e1e] font-medium"
                      onKeyDown={(e) => handleKeyDown(e, idx)}
                      onInput={() => handleInput(idx)}
                      onBlur={() => handleInput(idx)}
                    >
                      {block.content}
                    </div>
                    {props.expanded && (
                      <div className="pl-4 border-l-2 border-[#333] mt-1 text-gray-400 text-sm">
                        Toggle content placeholder (nested blocks coming soon)
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            return (
              <div key={block.id} className="flex items-start gap-2 group">
                {block.type !== 'paragraph' && block.type !== 'heading' && block.type !== 'code' && block.type !== 'divider' && (
                  <span className="mt-2 w-6 text-center text-gray-400 select-none shrink-0">{TYPE_ICONS[block.type]}</span>
                )}
                {block.type === 'divider' ? (
                  <div className="flex-1 py-3">
                    <hr className="border-[#2f2f2f]" />
                  </div>
                ) : block.type === 'code' ? (
                  <div className="flex-1 relative">
                    <pre className="py-2 px-3 text-sm font-mono bg-[#151515] text-gray-300 rounded border border-[#2f2f2f] whitespace-pre-wrap">
                      <code className={`language-${props.language || 'text'}`}>
                        {block.content}
                      </code>
                    </pre>
                    <div
                      ref={(el) => { blockRefs.current[idx] = el; }}
                      contentEditable
                      suppressContentEditableWarning
                      className="absolute inset-0 py-2 px-3 text-sm font-mono text-transparent caret-white outline-none whitespace-pre-wrap"
                      onKeyDown={(e) => handleKeyDown(e, idx)}
                      onInput={() => handleInput(idx)}
                      onBlur={() => handleInput(idx)}
                    >
                      {block.content}
                    </div>
                  </div>
                ) : (
                  <div
                    ref={(el) => { blockRefs.current[idx] = el; }}
                    contentEditable
                    suppressContentEditableWarning
                    data-placeholder={PLACEHOLDERS[block.type]}
                    className={['flex-1', blockClass(block.type)].join(' ')}
                    style={block.type === 'heading' && props.level === 2 ? { fontSize: '1.5rem' } : undefined}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                    onInput={() => handleInput(idx)}
                    onBlur={() => handleInput(idx)}
                  >
                    {block.content}
                  </div>
                )}
              </div>
            );
          })}
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
