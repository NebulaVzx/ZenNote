import { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { api } from '../api';
import { SlashCommand, type SlashItem } from './SlashCommand';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import type { Block, BlockType } from '../types';

interface EditorProps {
  pageId: string;
  title: string;
  onTitleChange: (title: string) => void;
  searchQuery: string;
  currentSearchIndex: number;
  onSearchMatchCountChange: (count: number) => void;
  onEditorInput: () => void;
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

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function Editor({
  pageId,
  title,
  onTitleChange,
  searchQuery,
  currentSearchIndex,
  onSearchMatchCountChange,
  onEditorInput,
}: EditorProps) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loaded, setLoaded] = useState(false);
  const blockRefs = useRef<(HTMLDivElement | null)[]>([]);
  const saveTimer = useRef<number | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

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
    setActiveIdx(null);
    api.getBlocks(pageId).then((data) => {
      const safe = data.length ? data : [createEmptyBlock()];
      setBlocks(safe);
      setLoaded(true);
    });
  }, [pageId, createEmptyBlock]);

  const updateBlock = useCallback((idx: number, patch: Partial<Block>) => {
    setBlocks((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch, updated_at: Date.now() };
      return next;
    });
  }, []);

  const getBlockText = (idx: number) => blockRefs.current[idx]?.innerText || '';

  const flushBlock = useCallback((idx: number) => {
    const text = getBlockText(idx);
    setBlocks((prev) => {
      if (!prev[idx]) return prev;
      if (prev[idx].content === text) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], content: text, updated_at: Date.now() };
      return next;
    });
  }, []);

  const flushAllBlocks = useCallback(() => {
    setBlocks((prev) => {
      const next = [...prev];
      let changed = false;
      next.forEach((b, i) => {
        const text = blockRefs.current[i]?.innerText || '';
        if (b.content !== text) {
          next[i] = { ...b, content: text, updated_at: Date.now() };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, []);

  // Auto save from DOM
  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      flushAllBlocks();
      const payload = blocks.map((b, i) => {
        const text = blockRefs.current[i]?.innerText || '';
        return { ...b, content: text };
      });
      api.updateBlocks(pageId, payload).catch(console.error);
    }, 1500);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [blocks, pageId, loaded, flushAllBlocks]);

  // Compute search match count (use DOM text for accuracy)
  useEffect(() => {
    if (!searchQuery.trim()) {
      onSearchMatchCountChange(0);
      return;
    }
    let count = 0;
    const q = searchQuery.toLowerCase();
    blocks.forEach((b, i) => {
      const text = activeIdx === i ? getBlockText(i) : b.content;
      if (!text) return;
      const parts = text.toLowerCase().split(q);
      count += parts.length - 1;
    });
    onSearchMatchCountChange(count);
  }, [blocks, activeIdx, searchQuery, onSearchMatchCountChange]);

  // Scroll to current search match
  useEffect(() => {
    if (!searchQuery.trim() || currentSearchIndex < 0) return;
    const el = editorRef.current?.querySelector(`[data-search-match="${currentSearchIndex}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentSearchIndex, searchQuery]);

  const insertBlock = (afterIdx: number, type: BlockType = 'paragraph') => {
    flushBlock(afterIdx);
    setBlocks((prev) => {
      const next = [...prev];
      const nb = { ...createEmptyBlock(), type };
      next.splice(afterIdx + 1, 0, nb);
      return next.map((b, i) => ({ ...b, sort_order: i }));
    });
    setSlashOpen(false);
    setToolbarVisible(false);
    setActiveIdx(afterIdx + 1);
    setTimeout(() => {
      const el = blockRefs.current[afterIdx + 1];
      el?.focus();
      placeCaretAtEnd(el);
    }, 0);
  };

  const insertBlockBefore = (beforeIdx: number, type: BlockType = 'paragraph') => {
    flushBlock(beforeIdx);
    setBlocks((prev) => {
      const next = [...prev];
      const nb = { ...createEmptyBlock(), type };
      next.splice(beforeIdx, 0, nb);
      return next.map((b, i) => ({ ...b, sort_order: i }));
    });
    setSlashOpen(false);
    setToolbarVisible(false);
    setActiveIdx(beforeIdx);
    setTimeout(() => {
      const el = blockRefs.current[beforeIdx];
      el?.focus();
      placeCaretAtEnd(el);
    }, 0);
  };

  const removeBlock = (idx: number) => {
    setBlocks((prev) => {
      if (prev.length <= 1) {
        // Turn the last block back into a paragraph instead of removing it
        const next = [...prev];
        next[idx] = { ...next[idx], type: 'paragraph', content: '', props: '{}', updated_at: Date.now() };
        return next;
      }
      const next = [...prev];
      next.splice(idx, 1);
      return next.map((b, i) => ({ ...b, sort_order: i }));
    });
    const targetIdx = Math.max(0, idx - 1);
    setActiveIdx(targetIdx);
    setTimeout(() => {
      const el = blockRefs.current[targetIdx];
      el?.focus();
      placeCaretAtEnd(el);
    }, 0);
  };

  const checkMarkdownShortcut = (idx: number, text: string) => {
    if (text === '# ') {
      updateBlock(idx, { type: 'heading', content: '', props: JSON.stringify({ level: 1 }) });
      setBlockText(idx, '');
      return true;
    }
    if (text === '## ') {
      updateBlock(idx, { type: 'heading', content: '', props: JSON.stringify({ level: 2 }) });
      setBlockText(idx, '');
      return true;
    }
    if (text === '- ') {
      updateBlock(idx, { type: 'bullet_list', content: '' });
      setBlockText(idx, '');
      return true;
    }
    if (text === '1. ') {
      updateBlock(idx, { type: 'numbered_list', content: '' });
      setBlockText(idx, '');
      return true;
    }
    if (text === '[] ') {
      updateBlock(idx, { type: 'todo_list', content: '', props: JSON.stringify({ checked: false }) });
      setBlockText(idx, '');
      return true;
    }
    if (text === '> ') {
      updateBlock(idx, { type: 'paragraph', content: '' });
      setBlockText(idx, '');
      return true;
    }
    if (text.startsWith('```')) {
      let lang = text.slice(3).trim() || 'text';
      const aliasMap: Record<string, string> = {
        ts: 'typescript',
        js: 'javascript',
        py: 'python',
        rb: 'ruby',
        sh: 'bash',
        yml: 'yaml',
        md: 'markdown',
        hs: 'haskell',
      };
      if (aliasMap[lang]) lang = aliasMap[lang];
      updateBlock(idx, { type: 'code', content: '', props: JSON.stringify({ language: lang }) });
      setBlockText(idx, '');
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
      setBlockText(idx, '');
    } else if (item.type === 'code') {
      updateBlock(idx, { type: 'code', content: '', props: JSON.stringify({ language: 'typescript' }) });
      setBlockText(idx, '');
    } else if (item.type === 'toggle') {
      updateBlock(idx, { type: 'toggle', content: '' });
      setBlockText(idx, '');
    } else if (item.label === 'Heading 1') {
      updateBlock(idx, { type: 'heading', props: JSON.stringify({ level: 1 }) });
      setBlockText(idx, '');
    } else if (item.label === 'Heading 2') {
      updateBlock(idx, { type: 'heading', props: JSON.stringify({ level: 2 }) });
      setBlockText(idx, '');
    } else {
      updateBlock(idx, { type: item.type });
      setBlockText(idx, '');
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
      const sel = window.getSelection();
      const offset = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).startOffset : 0;
      if (blocks[idx].type === 'code') {
        if (offset === 0) {
          flushBlock(idx);
          insertBlockBefore(idx, 'paragraph');
        } else if (offset >= text.length) {
          flushBlock(idx);
          insertBlock(idx, 'paragraph');
        } else {
          document.execCommand('insertText', false, '\n');
        }
      } else {
        if (offset === 0 && text.trim() !== '') {
          flushBlock(idx);
          insertBlockBefore(idx, 'paragraph');
        } else {
          flushBlock(idx);
          insertBlock(idx);
        }
      }
      return;
    }

    if (e.key === 'Backspace' && text.trim() === '') {
      e.preventDefault();
      if (slashOpen) setSlashOpen(false);
      removeBlock(idx);
      return;
    }

    if (e.key === 'Escape') {
      setSlashOpen(false);
      setToolbarVisible(false);
      el?.blur();
      return;
    }

    if (e.key === 'ArrowUp' && idx > 0) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        const prevEl = blockRefs.current[idx - 1];
        if (prevEl && rect.top <= prevEl.getBoundingClientRect().bottom) {
          e.preventDefault();
          flushBlock(idx);
          setActiveIdx(idx - 1);
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
          flushBlock(idx);
          setActiveIdx(idx + 1);
          nextEl.focus();
          placeCaretAtEnd(nextEl);
        }
      }
    }
  };

  const normalizeText = (text: string) => text.replace(/\u00A0/g, ' ');

  const handleInput = (idx: number) => {
    onEditorInput();
    const el = blockRefs.current[idx];
    const text = normalizeText(el?.innerText || '');

    // Real-time code block highlight so typing is visible
    const block = blocks[idx];
    if (block?.type === 'code' && el) {
      const props = JSON.parse(block.props || '{}');
      const preCode = el.parentElement?.querySelector('pre code');
      if (preCode) {
        preCode.innerHTML = hljs.highlight(text || '', { language: props.language || 'text' }).value;
      }
    }

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
    if (wasShortcut) {
      // Markdown shortcut handled
    }
  };

  const handleBlur = (idx: number, e: React.FocusEvent<HTMLDivElement>) => {
    const related = e.relatedTarget as HTMLElement | null;
    const container = document.querySelector(`[data-block-idx="${idx}"]`);
    if (container && related && container.contains(related)) {
      // Focus moved within same block (e.g. checkbox), keep active
      return;
    }
    flushBlock(idx);
    setActiveIdx(null);
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
        return 'hidden';
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

  const setBlockText = (idx: number, text: string) => {
    const el = blockRefs.current[idx];
    if (el) el.innerText = text;
  };

  const activateBlock = (idx: number) => {
    flushAllBlocks();
    setActiveIdx(idx);
    setTimeout(() => {
      const el = blockRefs.current[idx];
      if (el) {
        el.focus();
        placeCaretAtEnd(el);
      }
    }, 0);
  };

  const renderSearchContent = (text: string, baseCounter: { current: number }) => {
    const q = searchQuery.trim();
    if (!q) return text;
    const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, 'gi'));
    return parts.map((part, i) => {
      if (part.toLowerCase() === q.toLowerCase()) {
        const idx = baseCounter.current++;
        const isCurrent = idx === currentSearchIndex;
        return (
          <span
            key={i}
            className={`rounded px-0.5 ${isCurrent ? 'bg-yellow-500 text-black font-medium' : 'bg-yellow-600/60 text-white'}`}
            data-search-match={idx}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // Initialize editable innerText when block type/id changes or first mounts
  useLayoutEffect(() => {
    if (!loaded) return;
    blocks.forEach((b, i) => {
      const el = blockRefs.current[i];
      if (!el) return;
      if (activeIdx === i) {
        if (el.innerText === '' && b.content) {
          el.innerText = b.content;
        }
      } else {
        el.innerText = b.content;
      }
    });
  }, [blocks, loaded, activeIdx]);

  if (!loaded) {
    return <div className="flex-1 p-8 text-gray-500">Loading...</div>;
  }

  const searchCounter = { current: 0 };

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
            const isActive = activeIdx === idx;

            if (block.type === 'toggle') {
              return (
                <div key={block.id} data-block-idx={idx} className="flex items-start gap-2 group">
                  <button onClick={() => toggleExpand(idx)} className="mt-2 w-6 text-center text-gray-400 select-none shrink-0 hover:text-gray-200">
                    {props.expanded ? '▼' : '▶'}
                  </button>
                  <div className="flex-1">
                    {isActive ? (
                      <div
                        ref={(el) => { blockRefs.current[idx] = el; }}
                        contentEditable
                        suppressContentEditableWarning
                        data-placeholder={PLACEHOLDERS.toggle}
                        className="py-1.5 px-1 outline-none text-gray-200 zen-editor rounded hover:bg-[#1e1e1e] font-medium"
                        onKeyDown={(e) => handleKeyDown(e, idx)}
                        onInput={() => handleInput(idx)}
                        onBlur={(e) => handleBlur(idx, e)}
                        onFocus={() => setActiveIdx(idx)}
                      />
                    ) : (
                      <div
                        ref={(el) => { blockRefs.current[idx] = el; }}
                        className="py-1.5 px-1 text-gray-200 rounded hover:bg-[#1e1e1e] font-medium cursor-text"
                        onClick={() => activateBlock(idx)}
                      >
                        {renderSearchContent(block.content, searchCounter)}
                      </div>
                    )}
                    {props.expanded && (
                      <div className="pl-4 border-l-2 border-[#333] mt-1 text-gray-400 text-sm">
                        Toggle content placeholder (nested blocks coming soon)
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            // Icon / checkbox for list types
            let leftIcon: React.ReactNode = null;
            if (block.type === 'bullet_list') leftIcon = <span className="mt-2 w-6 text-center text-gray-400 select-none shrink-0">•</span>;
            else if (block.type === 'numbered_list') leftIcon = <span className="mt-2 w-6 text-center text-gray-400 select-none shrink-0">1.</span>;
            else if (block.type === 'todo_list') {
              leftIcon = (
                <input
                  type="checkbox"
                  tabIndex={-1}
                  className="mt-2.5 w-4 h-4 accent-[#6366f1] cursor-pointer shrink-0"
                  checked={!!props.checked}
                  onChange={(e) => updateBlock(idx, { props: JSON.stringify({ ...props, checked: e.target.checked }) })}
                />
              );
            }

            const handleBlockDragStart = (e: React.DragEvent, index: number) => {
              e.dataTransfer.setData('text/plain', String(index));
              e.dataTransfer.effectAllowed = 'move';
            };

            const handleBlockDragOver = (e: React.DragEvent) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            };

            const handleBlockDrop = (e: React.DragEvent, targetIdx: number) => {
              e.preventDefault();
              const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
              if (isNaN(fromIdx) || fromIdx === targetIdx) return;
              setBlocks((prev) => {
                const next = [...prev];
                const [moved] = next.splice(fromIdx, 1);
                next.splice(targetIdx, 0, moved);
                return next.map((b, i) => ({ ...b, sort_order: i }));
              });
              const newActive = activeIdx === fromIdx ? targetIdx : activeIdx;
              setActiveIdx(newActive);
            };

            return (
              <div
                key={block.id}
                data-block-idx={idx}
                draggable
                onDragStart={(e) => handleBlockDragStart(e, idx)}
                onDragOver={handleBlockDragOver}
                onDrop={(e) => handleBlockDrop(e, idx)}
                className="flex items-start gap-2 group cursor-move"
              >
                <div className="mt-1.5 w-5 text-center text-gray-500 select-none shrink-0 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing">
                  ⋮⋮
                </div>
                {leftIcon}
                {block.type === 'divider' ? (
                  <div className="flex-1 py-3">
                    <hr className="border-[#2f2f2f]" />
                  </div>
                ) : block.type === 'code' ? (
                  <div className="flex-1 relative group min-w-0">
                    <div className="flex items-center justify-between px-2 py-1 h-7 bg-[#1a1a1a] rounded-t border-x border-t border-[#2f2f2f]">
                      <span className="text-xs text-gray-500 font-medium">Code block</span>
                      <select
                        value={props.language || 'text'}
                        onChange={(e) => updateBlock(idx, { props: JSON.stringify({ ...props, language: e.target.value }) })}
                        className="text-xs bg-[#252525] text-gray-300 border border-[#333] rounded px-1.5 py-0.5 outline-none hover:border-[#444]"
                      >
                        {['text','typescript','javascript','python','go','rust','html','css','json','sql','bash','java','cpp','c','php','ruby','swift','kotlin'].map((lang) => (
                          <option key={lang} value={lang}>{lang}</option>
                        ))}
                      </select>
                    </div>
                    <pre className="py-2 px-3 text-sm font-mono bg-[#151515] text-gray-300 rounded-b border-x border-b border-[#2f2f2f] whitespace-pre-wrap overflow-x-auto max-h-[500px] min-w-0">
                      <code
                        className={`language-${props.language || 'text'}`}
                        dangerouslySetInnerHTML={{
                          __html: hljs.highlight(block.content || '', { language: props.language || 'text' }).value,
                        }}
                      />
                    </pre>
                    <div
                      ref={(el) => { blockRefs.current[idx] = el; }}
                      contentEditable
                      suppressContentEditableWarning
                      className="absolute inset-0 top-[28px] py-2 px-3 text-sm font-mono text-transparent caret-white outline-none whitespace-pre-wrap"
                      onKeyDown={(e) => handleKeyDown(e, idx)}
                      onInput={() => handleInput(idx)}
                      onBlur={(e) => handleBlur(idx, e)}
                      onFocus={() => setActiveIdx(idx)}
                    />
                  </div>
                ) : (
                  <div className="flex-1">
                    {isActive ? (
                      <div
                        ref={(el) => { blockRefs.current[idx] = el; }}
                        contentEditable
                        suppressContentEditableWarning
                        data-placeholder={PLACEHOLDERS[block.type]}
                        className={blockClass(block.type)}
                        style={block.type === 'heading' && props.level === 2 ? { fontSize: '1.5rem' } : undefined}
                        onKeyDown={(e) => handleKeyDown(e, idx)}
                        onInput={() => handleInput(idx)}
                        onBlur={(e) => handleBlur(idx, e)}
                        onFocus={() => setActiveIdx(idx)}
                      />
                    ) : (
                      <div
                        ref={(el) => { blockRefs.current[idx] = el; }}
                        data-placeholder={PLACEHOLDERS[block.type]}
                        className={[blockClass(block.type), 'cursor-text'].join(' ')}
                        style={block.type === 'heading' && props.level === 2 ? { fontSize: '1.5rem' } : undefined}
                        onClick={() => activateBlock(idx)}
                      >
                        {renderSearchContent(block.content, searchCounter)}
                      </div>
                    )}
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
  if (!el.childNodes.length) {
    const br = document.createElement('br');
    el.appendChild(br);
    range.setStartBefore(br);
    range.collapse(true);
  } else {
    range.selectNodeContents(el);
    range.collapse(false);
  }
  const sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    sel.addRange(range);
  }
}
