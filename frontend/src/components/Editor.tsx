import { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { api } from '../api';
import { SlashCommand, ITEMS, type SlashItem } from './SlashCommand';
import { AIActionPanel } from './AIActionPanel';
import { EmojiPicker } from './EmojiPicker';
import SimpleEditor from 'react-simple-code-editor';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import { generateMarkdown } from '../utils/markdown';
import type { Block, BlockType } from '../types';

interface EditorProps {
  pageId: string;
  title: string;
  icon?: string;
  filePath?: string;
  frontmatter?: string;
  onTitleChange: (title: string) => void;
  onIconChange?: (icon: string) => void;
  searchQuery: string;
  currentSearchIndex: number;
  onSearchMatchCountChange: (count: number) => void;
  onEditorInput: () => void;
  jumpToBlockId?: string | null;
  onJumpToBlockDone?: () => void;
}

const PLACEHOLDERS: Record<BlockType, string> = {
  paragraph: "Type '/' for commands",
  heading: 'Heading',
  bullet_list: 'List item',
  numbered_list: 'List item',
  todo_list: 'To-do',
  code: '// Code here',
  toggle: 'Toggle',
  quote: 'Quote',
  divider: '',
  image: '',
};

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || '';
}

export function Editor({
  pageId,
  title,
  icon,
  filePath,
  frontmatter,
  onTitleChange,
  onIconChange,
  searchQuery,
  currentSearchIndex,
  onSearchMatchCountChange,
  onEditorInput,
  jumpToBlockId,
  onJumpToBlockDone,
}: EditorProps) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loaded, setLoaded] = useState(false);
  const blockRefs = useRef<(HTMLElement | null)[]>([]);
  const saveTimer = useRef<number | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [dragOverPos, setDragOverPos] = useState<'before' | 'after' | null>(null);
  const [localTitle, setLocalTitle] = useState(title);
  const lastSelectAllRef = useRef<number>(0);

  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  // Slash command state
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashIdx, setSlashIdx] = useState(0);
  const slashPos = useRef<{ left: number; top: number }>({ left: 0, top: 0 });

  // Floating toolbar state
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ left: 0, top: 0 });

  // AI panel state
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiPanelPos, setAiPanelPos] = useState({ left: 0, top: 0 });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiGhost, setAiGhost] = useState<{ index: number; content: string } | null>(null);

  // Block menu state
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);
  const [blockMenuIdx, setBlockMenuIdx] = useState<number | null>(null);
  const [blockMenuPos, setBlockMenuPos] = useState({ left: 0, top: 0 });

  // Emoji picker state
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

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

  // Auto-focus title when opening a newly created page
  useEffect(() => {
    if (loaded && title.startsWith('New Page')) {
      titleRef.current?.focus();
      titleRef.current?.select();
    }
  }, [loaded, title]);

  const updateBlock = useCallback((idx: number, patch: Partial<Block>) => {
    setBlocks((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch, updated_at: Date.now() };
      return next;
    });
  }, []);

  const getBlockText = (idx: number) => {
    const el = blockRefs.current[idx];
    if (!el) return '';
    if (el.tagName === 'TEXTAREA') return (el as HTMLTextAreaElement).value;
    return el.innerText || '';
  };

  const getBlockHTML = (idx: number) => {
    const el = blockRefs.current[idx];
    if (!el) return '';
    if (el.tagName === 'TEXTAREA') return (el as HTMLTextAreaElement).value;
    return el.innerHTML || '';
  };

  const flushBlock = useCallback((idx: number) => {
    const html = getBlockHTML(idx);
    setBlocks((prev) => {
      if (!prev[idx]) return prev;
      if (prev[idx].content === html) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], content: html, updated_at: Date.now() };
      return next;
    });
  }, []);

  const flushAllBlocks = useCallback(() => {
    setBlocks((prev) => {
      const next = [...prev];
      let changed = false;
      next.forEach((b, i) => {
        const el = blockRefs.current[i];
        const html = el && el.tagName === 'TEXTAREA' ? (el as HTMLTextAreaElement).value : el?.innerHTML || '';
        if (b.content !== html) {
          next[i] = { ...b, content: html, updated_at: Date.now() };
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
        const html = blockRefs.current[i]?.innerHTML || '';
        return { ...b, content: html };
      });
      api.updateBlocks(pageId, payload).then(() => {
        if (filePath) {
          const fm: Record<string, any> = {};
          if (frontmatter) { try { Object.assign(fm, JSON.parse(frontmatter)); } catch {} }
          fm.title = title;
          if (icon) fm.icon = icon;
          const md = generateMarkdown(payload, fm);
          invoke('save_markdown_file', { filePath, content: md }).catch(console.error);
        }
      }).catch(console.error);
    }, 1500);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [blocks, pageId, loaded, flushAllBlocks, filePath, frontmatter, title, icon]);

  // Compute search match count (use DOM text for accuracy)
  useEffect(() => {
    if (!searchQuery.trim()) {
      onSearchMatchCountChange(0);
      return;
    }
    let count = 0;
    const q = searchQuery.toLowerCase();
    blocks.forEach((b, i) => {
      const raw = activeIdx === i ? getBlockText(i) : b.content;
      const text = stripHtml(raw);
      if (!text) return;
      const parts = text.toLowerCase().split(q);
      count += parts.length - 1;
    });
    onSearchMatchCountChange(count);
  }, [blocks, activeIdx, searchQuery, onSearchMatchCountChange]);

  // DOM-level search highlight
  useEffect(() => {
    if (!editorRef.current) return;
    // Clear previous highlights
    editorRef.current.querySelectorAll('[data-search-highlight]').forEach((el) => {
      const parent = el.parentNode!;
      parent.insertBefore(document.createTextNode(el.textContent || ''), el);
      parent.removeChild(el);
      parent.normalize();
    });

    if (!searchQuery.trim()) return;

    const q = searchQuery.toLowerCase();
    let matchIdx = 0;
    const walker = document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );
    const textNodes: Text[] = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

    for (const node of textNodes) {
      const text = node.textContent || '';
      const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, 'gi'));
      if (parts.length <= 1) continue;
      const parent = node.parentNode!;
      parts.forEach((part) => {
        if (part.toLowerCase() === q) {
          const span = document.createElement('span');
          span.className = matchIdx === currentSearchIndex
            ? 'bg-yellow-500 text-black font-medium rounded px-0.5'
            : 'bg-yellow-600/60 text-white rounded px-0.5';
          span.dataset.searchMatch = String(matchIdx);
          span.dataset.searchHighlight = 'true';
          span.textContent = part;
          parent.insertBefore(span, node);
          matchIdx++;
        } else {
          parent.insertBefore(document.createTextNode(part), node);
        }
      });
      parent.removeChild(node);
    }
  }, [searchQuery, currentSearchIndex, blocks]);

  // Scroll to current search match
  useEffect(() => {
    if (!searchQuery.trim() || currentSearchIndex < 0) return;
    const el = editorRef.current?.querySelector(`[data-search-match="${currentSearchIndex}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentSearchIndex, searchQuery]);

  // Jump to block from global search
  useEffect(() => {
    if (!loaded || !jumpToBlockId) return;
    const idx = blocks.findIndex((b) => b.id === jumpToBlockId);
    if (idx === -1) return;
    const el = blockRefs.current[idx];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-blue-500/20');
      setTimeout(() => {
        el.classList.remove('bg-blue-500/20');
      }, 1500);
    }
    onJumpToBlockDone?.();
  }, [loaded, jumpToBlockId, blocks, onJumpToBlockDone]);

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
      focusBlockEnd(el);
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
      focusBlockEnd(el);
    }, 0);
  };

  const handleCodeKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, idx: number) => {
    const target = e.currentTarget;
    if (e.key === 'Enter' && !e.shiftKey) {
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const text = target.value;
      const isAtStart = start === 0 && end === 0;

      if (isAtStart) {
        e.preventDefault();
        insertBlockBefore(idx, 'paragraph');
        return;
      }

      const beforeText = text.slice(0, start);
      const lineStart = beforeText.lastIndexOf('\n') + 1;
      const currentLine = beforeText.slice(lineStart);
      const isEmptyLine = currentLine.trim() === '';
      const isLastLine = !text.slice(end).includes('\n');

      if (isEmptyLine && isLastLine) {
        e.preventDefault();
        const newContent = text.slice(0, start - 1) + text.slice(end);
        updateBlock(idx, { content: newContent });
        insertBlock(idx, 'paragraph');
        return;
      }

      // Let react-simple-code-editor / browser handle normal Enter (auto-indent + newline)
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      updateBlock(idx, { content: newValue });
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
    if (e.key === 'Backspace' && target.value === '') {
      e.preventDefault();
      removeBlock(idx);
    }
    if (e.key === 'ArrowUp' && idx > 0) {
      const before = target.value.slice(0, target.selectionStart);
      const lineIndex = before.split('\n').length - 1;
      if (lineIndex === 0) {
        e.preventDefault();
        flushBlock(idx);
        setActiveIdx(idx - 1);
        setTimeout(() => focusBlockEnd(blockRefs.current[idx - 1]), 0);
      }
    }
    if (e.key === 'ArrowDown' && idx < blocks.length - 1) {
      const before = target.value.slice(0, target.selectionStart);
      const lineIndex = before.split('\n').length - 1;
      const totalLines = target.value.split('\n').length - 1;
      if (lineIndex === totalLines) {
        e.preventDefault();
        flushBlock(idx);
        setActiveIdx(idx + 1);
        setTimeout(() => focusBlockStart(blockRefs.current[idx + 1]), 0);
      }
    }
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
      focusBlockEnd(el);
    }, 0);
  };

  const duplicateBlock = (idx: number) => {
    flushBlock(idx);
    setBlocks((prev) => {
      const next = [...prev];
      const original = next[idx];
      const copy: Block = { ...original, id: generateId('block'), created_at: Date.now(), updated_at: Date.now() };
      next.splice(idx + 1, 0, copy);
      return next.map((b, i) => ({ ...b, sort_order: i }));
    });
    setActiveIdx(idx + 1);
    setTimeout(() => {
      const el = blockRefs.current[idx + 1];
      focusBlockEnd(el);
    }, 0);
  };

  const checkMarkdownShortcut = (idx: number, text: string) => {
    if (text === '#') {
      updateBlock(idx, { type: 'heading', content: '', props: JSON.stringify({ level: 1 }) });
      setBlockText(idx, '');
      return true;
    }
    if (text === '##') {
      updateBlock(idx, { type: 'heading', content: '', props: JSON.stringify({ level: 2 }) });
      setBlockText(idx, '');
      return true;
    }
    if (text === '###') {
      updateBlock(idx, { type: 'heading', content: '', props: JSON.stringify({ level: 3 }) });
      setBlockText(idx, '');
      return true;
    }
    if (text === '-') {
      updateBlock(idx, { type: 'bullet_list', content: '' });
      setBlockText(idx, '');
      return true;
    }
    if (text === '1.') {
      updateBlock(idx, { type: 'numbered_list', content: '' });
      setBlockText(idx, '');
      return true;
    }
    if (text === '[]') {
      updateBlock(idx, { type: 'todo_list', content: '', props: JSON.stringify({ checked: false }) });
      setBlockText(idx, '');
      return true;
    }
    if (text === '>') {
      updateBlock(idx, { type: 'quote', content: '' });
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
    if (item.label === 'AI Assist') {
      setAiPanelPos(slashPos.current);
      setAiPanelOpen(true);
      return;
    }
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
      if (!el) return;
      if (el.tagName === 'TEXTAREA') {
        el.focus();
        const ta = el as HTMLTextAreaElement;
        ta.selectionStart = ta.selectionEnd = ta.value.length;
      } else {
        el.focus();
        placeCaretAtEnd(el as HTMLDivElement);
      }
    }, 0);
  };

  const handleAIAction = async (action: import('../types').AIAction, language?: string) => {
    setAiLoading(true);
    const idx = activeIdx ?? slashIdx;
    const el = blockRefs.current[idx];
    const blockText = el ? (el.tagName === 'TEXTAREA' ? (el as HTMLTextAreaElement).value : el.innerText || '') : '';
    const selectedText = window.getSelection()?.toString() || '';
    const prompt = selectedText || blockText;

    try {
      const res = await api.generateAI({ prompt, action, language });
      setAiGhost({ index: idx, content: res.content });
      setAiPanelOpen(false);
    } catch (e: any) {
      window.alert(e.message || 'AI generation failed');
    }
    setAiLoading(false);
  };

  const acceptAIGhost = () => {
    if (!aiGhost) return;
    const idx = aiGhost.index;
    const paragraphs = aiGhost.content.split('\n\n').filter((p) => p.trim() !== '');
    if (paragraphs.length === 0) {
      setAiGhost(null);
      return;
    }
    flushBlock(idx);
    setBlocks((prev) => {
      const next = [...prev];
      paragraphs.forEach((content, i) => {
        const nb = { ...createEmptyBlock(), type: 'paragraph' as BlockType, content };
        next.splice(idx + 1 + i, 0, nb);
      });
      return next.map((b, i) => ({ ...b, sort_order: i }));
    });
    setActiveIdx(idx + paragraphs.length);
    setAiGhost(null);
    setTimeout(() => {
      const el = blockRefs.current[idx + paragraphs.length];
      focusBlockEnd(el);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, idx: number) => {
    const el = blockRefs.current[idx];
    const text = getBlockText(idx);

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      const now = Date.now();
      const timeSinceLast = now - lastSelectAllRef.current;
      lastSelectAllRef.current = now;

      if (timeSinceLast < 600) {
        // Double Ctrl+A -> select all blocks
        const sel = window.getSelection();
        const first = blockRefs.current.find((el): el is HTMLElement => !!el);
        const last = [...blockRefs.current].reverse().find((el): el is HTMLElement => !!el);
        if (sel && first && last) {
          const range = document.createRange();
          range.setStartBefore(first);
          range.setEndAfter(last);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      } else {
        // Single Ctrl+A -> select current block
        const cur = blockRefs.current[idx];
        if (cur) {
          const range = document.createRange();
          range.selectNodeContents(cur);
          const sel = window.getSelection();
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      }
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (slashOpen) return;
      const sel = window.getSelection();
      const offset = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).startOffset : 0;
      if (offset === 0 && text.trim() !== '') {
        flushBlock(idx);
        insertBlockBefore(idx, 'paragraph');
      } else {
        flushBlock(idx);
        insertBlock(idx);
      }
      return;
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const startEl = blockRefs.current[idx];
        let isMultiBlock = false;
        if (startEl) {
          try {
            const common = range.commonAncestorContainer;
            isMultiBlock = !(common === startEl || startEl.contains(common));
          } catch {
            isMultiBlock = false;
          }
        }
        if (isMultiBlock) {
          e.preventDefault();
          const toDelete: number[] = [];
          blockRefs.current.forEach((el, i) => {
            if (el && range.intersectsNode(el)) {
              toDelete.push(i);
            }
          });
          if (toDelete.length > 0) {
            setBlocks((prev) => {
              const next = prev.filter((_, i) => !toDelete.includes(i));
              if (next.length === 0) return [createEmptyBlock()];
              return next.map((b, i) => ({ ...b, sort_order: i }));
            });
            const newActive = Math.max(0, toDelete[0] - 1);
            setActiveIdx(newActive);
            setTimeout(() => focusBlockEnd(blockRefs.current[newActive]), 0);
          }
          return;
        }
      }
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

    if (e.key === 'ArrowUp' && idx > 0 && el) {
      if (isAtBlockStart(el)) {
        e.preventDefault();
        flushBlock(idx);
        setActiveIdx(idx - 1);
        setTimeout(() => focusBlockEnd(blockRefs.current[idx - 1]), 0);
      }
    }
    if (e.key === 'ArrowDown' && idx < blocks.length - 1 && el) {
      if (isAtBlockEnd(el)) {
        e.preventDefault();
        flushBlock(idx);
        setActiveIdx(idx + 1);
        setTimeout(() => focusBlockStart(blockRefs.current[idx + 1]), 0);
      }
    }
  };

  const normalizeText = (text: string) => text.replace(/\u00A0/g, ' ').replace(/\u200B/g, '').trim();

  const handleInput = (idx: number) => {
    onEditorInput();
    const el = blockRefs.current[idx];
    const text = normalizeText(el?.innerText || '');

    // react-simple-code-editor handles code block highlighting internally
    const block = blocks[idx];
    if (block?.type === 'code') {
      return;
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
      setTimeout(() => {
        const el = blockRefs.current[idx];
        if (!el) return;
        if (el.tagName === 'TEXTAREA') {
          el.focus();
          const ta = el as HTMLTextAreaElement;
          ta.selectionStart = ta.selectionEnd = ta.value.length;
        } else {
          el.focus();
          placeCaretAtEnd(el as HTMLDivElement);
        }
      }, 0);
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

  const handleBlockDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
    setDraggedIdx(index);
  };

  const handleBlockDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
    setDragOverPos(null);
  };

  const handleBlockDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIdx === null || draggedIdx === index) {
      setDragOverIdx(null);
      setDragOverPos(null);
      return;
    }
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const pos = y < rect.height / 2 ? 'before' : 'after';
    setDragOverIdx(index);
    setDragOverPos(pos);
  };

  const handleBlockDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('text/plain');
    const fromIdx = parseInt(raw, 10);
    if (isNaN(fromIdx) || fromIdx === targetIdx) {
      handleBlockDragEnd();
      return;
    }
    let insertIdx = targetIdx;
    if (dragOverPos === 'after') insertIdx = targetIdx + 1;
    if (fromIdx < insertIdx) insertIdx -= 1;

    setBlocks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(insertIdx, 0, moved);
      return next.map((b, i) => ({ ...b, sort_order: i }));
    });

    setActiveIdx((prev) => {
      if (prev === null) return null;
      if (prev === fromIdx) return insertIdx;
      if (fromIdx < prev && insertIdx >= prev) return prev - 1;
      if (fromIdx > prev && insertIdx <= prev) return prev + 1;
      return prev;
    });

    handleBlockDragEnd();
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
      case 'quote':
        return base + ' border-l-4 border-gray-500 pl-3 italic text-gray-300';
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
    if (el) el.innerHTML = text;
  };

  const activateBlock = (idx: number) => {
    flushAllBlocks();
    setActiveIdx(idx);
    setTimeout(() => {
      const el = blockRefs.current[idx];
      if (!el) return;
      if (el.tagName === 'TEXTAREA') {
        el.focus();
        const ta = el as HTMLTextAreaElement;
        ta.selectionStart = ta.selectionEnd = ta.value.length;
      } else {
        el.focus();
        placeCaretAtEnd(el as HTMLDivElement);
      }
    }, 0);
  };

  // Initialize editable content when block type/id changes or first mounts
  useLayoutEffect(() => {
    if (!loaded) return;
    blocks.forEach((b, i) => {
      const el = blockRefs.current[i];
      if (!el) return;
      if (b.type === 'code') {
        // react-simple-code-editor manages its own textarea value
        return;
      }
      if (el.tagName === 'TEXTAREA') {
        const ta = el as HTMLTextAreaElement;
        // Don't override the focused textarea to avoid fighting with browser input/composition
        if (document.activeElement !== ta && ta.value !== b.content) {
          ta.value = b.content;
        }
      } else {
        if (activeIdx === i) {
          if (el.innerText === '' && b.content) {
            el.innerHTML = b.content;
          }
        } else {
          el.innerHTML = b.content;
        }
      }
    });
  }, [blocks, loaded, activeIdx]);

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
          <div className="w-px h-4 bg-[#444] mx-0.5" />
          <button
            onClick={() => {
              const sel = window.getSelection();
              setToolbarVisible(false);
              if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                const editorRect = editorRef.current?.getBoundingClientRect();
                if (editorRect) {
                  setAiPanelPos({ left: rect.left - editorRect.left + rect.width / 2 - 80, top: rect.top - editorRect.top - 50 });
                }
              }
              setAiPanelOpen(true);
            }}
            className="px-2 py-0.5 text-sm text-gray-200 hover:bg-[#333] rounded flex items-center gap-1"
            title="Ask AI"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
            AI
          </button>
        </div>
      )}
      {aiPanelOpen && (
        <div style={{ left: aiPanelPos.left, top: aiPanelPos.top, position: 'absolute' }}>
          <AIActionPanel open={aiPanelOpen} loading={aiLoading} onClose={() => setAiPanelOpen(false)} onAction={handleAIAction} />
        </div>
      )}
      {blockMenuOpen && blockMenuIdx !== null && (
        <div
          className="absolute z-50 w-48 bg-[#252525] border border-[#333] rounded-md shadow-xl py-1"
          style={{ left: blockMenuPos.left, top: blockMenuPos.top }}
        >
          <button
            onClick={() => { removeBlock(blockMenuIdx); setBlockMenuOpen(false); }}
            className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-[#333] flex items-center gap-2"
          >
            <span>🗑️</span> Delete
          </button>
          <button
            onClick={() => { duplicateBlock(blockMenuIdx); setBlockMenuOpen(false); }}
            className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-[#333] flex items-center gap-2"
          >
            <span>📄</span> Duplicate
          </button>
          <div className="h-px bg-[#333] my-1" />
          <div className="px-3 py-1 text-xs text-gray-500">Turn into</div>
          {ITEMS.filter((item) => item.label !== 'AI Assist').map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setSlashIdx(blockMenuIdx);
                handleSlashSelect(item);
                setBlockMenuOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-[#333] flex items-center gap-2"
            >
              <span className="text-gray-400">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
      <div className="max-w-[800px] w-full mx-auto px-8 py-10" onClick={() => { if (blockMenuOpen) setBlockMenuOpen(false); if (emojiPickerOpen) setEmojiPickerOpen(false); }}>
        <div className="flex items-start gap-3 mb-6">
          <div className="relative">
            <button
              onClick={() => setEmojiPickerOpen((v) => !v)}
              className="mt-2 text-3xl w-10 h-10 flex items-center justify-center hover:bg-[#252525] rounded transition-colors"
              title="Choose icon"
            >
              {icon || '📄'}
            </button>
            {emojiPickerOpen && (
              <div className="absolute left-0 top-12">
                <EmojiPicker
                  onSelect={(emoji) => onIconChange?.(emoji)}
                  onClose={() => setEmojiPickerOpen(false)}
                />
              </div>
            )}
          </div>
          <input
            ref={titleRef}
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={() => {
              if (localTitle !== title) onTitleChange(localTitle);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (localTitle !== title) onTitleChange(localTitle);
                if (blocks.length > 0) {
                  activateBlock(0);
                }
              }
            }}
            placeholder="Untitled"
            className="flex-1 bg-transparent text-4xl font-bold text-gray-100 placeholder-gray-600 outline-none"
          />
        </div>
        <div className="space-y-1">
          {blocks.map((block, idx) => {
            const props = JSON.parse(block.props || '{}');
            const isActive = activeIdx === idx;

            let listNumber = 1;
            if (block.type === 'numbered_list') {
              for (let i = idx - 1; i >= 0; i--) {
                if (blocks[i].type === 'numbered_list') listNumber++;
                else break;
              }
            }

            let leftIcon: React.ReactNode = null;
            if (block.type === 'toggle') {
              leftIcon = (
                <button onClick={() => toggleExpand(idx)} className="mt-2 w-6 text-center text-gray-400 select-none shrink-0 hover:text-gray-200">
                  {props.expanded ? '▼' : '▶'}
                </button>
              );
            } else if (block.type === 'bullet_list') leftIcon = <span className="mt-2 w-6 text-center text-gray-400 select-none shrink-0">•</span>;
            else if (block.type === 'numbered_list') leftIcon = <span className="mt-2 w-6 text-center text-gray-400 select-none shrink-0">{listNumber}.</span>;
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

            const blockNode = (
              <div
                key={block.id}
                data-block-idx={idx}
                data-block-id={block.id}
                className={['flex items-start gap-2 group relative', draggedIdx === idx ? 'opacity-50' : ''].join(' ')}
                onDragOver={(e) => handleBlockDragOver(e, idx)}
                onDrop={(e) => handleBlockDrop(e, idx)}
              >
                {dragOverIdx === idx && dragOverPos === 'before' && (
                  <div className="absolute -top-0.5 left-6 right-2 h-0.5 bg-blue-500 rounded z-10 pointer-events-none" />
                )}
                <div className="relative flex flex-col items-center">
                  <div
                    className="mt-1 py-1 px-0.5 w-5 text-center text-gray-500 select-none shrink-0 cursor-grab active:cursor-grabbing rounded hover:bg-[#333]"
                    draggable
                    onDragStart={(e) => handleBlockDragStart(e, idx)}
                    onDragEnd={handleBlockDragEnd}
                    onClick={(e) => e.stopPropagation()}
                    title="Drag to move"
                  >
                    ⋮⋮
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      const editorRect = editorRef.current?.getBoundingClientRect();
                      setBlockMenuIdx(idx);
                      setBlockMenuPos({
                        left: rect.left - (editorRect?.left || 0),
                        top: rect.bottom - (editorRect?.top || 0) + 4,
                      });
                      setBlockMenuOpen(true);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-[10px] text-gray-500 hover:text-gray-200 hover:bg-[#333] rounded leading-none"
                    title="Block menu"
                  >
                    ⋯
                  </button>
                </div>
                {leftIcon}
                {block.type === 'toggle' ? (
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
                        dangerouslySetInnerHTML={{ __html: block.content }}
                      />
                    )}
                    {props.expanded && (
                      <div className="pl-4 border-l-2 border-[#333] mt-1 text-gray-400 text-sm">
                        Toggle content placeholder (nested blocks coming soon)
                      </div>
                    )}
                  </div>
                ) : block.type === 'divider' ? (
                  <div className="flex-1 py-3">
                    <hr className="border-[#2f2f2f]" />
                  </div>
                ) : block.type === 'image' ? (
                  <div className="flex-1">
                    {props.src ? (
                      <img
                        src={props.src}
                        alt={block.content || ''}
                        className="max-w-full rounded border border-[#333]"
                        draggable={false}
                      />
                    ) : (
                      <div className="px-3 py-2 bg-[#1e1e1e] border border-[#333] rounded text-gray-500 text-sm">
                        Image (no source)
                      </div>
                    )}
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
                    <div
                      className="rounded-b border-x border-b border-[#2f2f2f] overflow-hidden bg-[#151515]"
                      ref={(el) => {
                        if (el) {
                          const ta = el.querySelector('textarea');
                          if (ta) blockRefs.current[idx] = ta as HTMLElement;
                        }
                      }}
                    >
                      <SimpleEditor
                        value={block.content}
                        onValueChange={(code) => {
                          onEditorInput();
                          updateBlock(idx, { content: code });
                        }}
                        highlight={(code) => hljs.highlight(code || ' ', { language: props.language || 'text' }).value}
                        padding={12}
                        className="text-sm font-mono text-gray-300 whitespace-pre-wrap min-w-0"
                        textareaClassName="bg-transparent text-transparent caret-white outline-none resize-none text-sm font-mono whitespace-pre-wrap min-w-0"
                        preClassName="text-sm font-mono text-gray-300 whitespace-pre-wrap min-w-0"
                        onKeyDown={(e) => handleCodeKeyDown(e as React.KeyboardEvent<HTMLTextAreaElement>, idx)}
                        onBlur={() => { flushBlock(idx); setActiveIdx(null); }}
                        onFocus={() => setActiveIdx(idx)}
                        spellCheck={false}
                        ignoreTabKey={true}
                        style={{ fontFamily: '"Fira Code", "Roboto Mono", monospace', minHeight: '1.5em' }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1">
                    {isActive ? (
                      <div
                        ref={(el) => { blockRefs.current[idx] = el; }}
                        contentEditable
                        suppressContentEditableWarning
                        data-placeholder={PLACEHOLDERS[block.type]}
                        className={[blockClass(block.type), block.type === 'todo_list' && props.checked ? 'line-through text-gray-500' : ''].join(' ')}
                        style={block.type === 'heading' && props.level === 2 ? { fontSize: '1.5rem' } : block.type === 'heading' && props.level === 3 ? { fontSize: '1.25rem' } : undefined}
                        onKeyDown={(e) => handleKeyDown(e, idx)}
                        onInput={() => handleInput(idx)}
                        onBlur={(e) => handleBlur(idx, e)}
                        onFocus={() => setActiveIdx(idx)}
                      />
                    ) : (
                      <div
                        ref={(el) => { blockRefs.current[idx] = el; }}
                        data-placeholder={PLACEHOLDERS[block.type]}
                        className={[blockClass(block.type), 'cursor-text', block.type === 'todo_list' && props.checked ? 'line-through text-gray-500' : ''].join(' ')}
                        style={block.type === 'heading' && props.level === 2 ? { fontSize: '1.5rem' } : block.type === 'heading' && props.level === 3 ? { fontSize: '1.25rem' } : undefined}
                        onClick={() => activateBlock(idx)}
                        dangerouslySetInnerHTML={{ __html: block.content }}
                      />
                    )}
                  </div>
                )}
                {dragOverIdx === idx && dragOverPos === 'after' && (
                  <div className="absolute -bottom-0.5 left-6 right-2 h-0.5 bg-blue-500 rounded z-10 pointer-events-none" />
                )}
              </div>
            );
            const clickToAdd = (block.type === 'code' || block.type === 'divider') ? (
              <div
                key={`add-${block.id}`}
                className="h-5 -mt-1 mb-1 ml-7 cursor-text hover:bg-[#252525]/60 rounded flex items-center justify-center text-gray-600 text-[10px] opacity-0 hover:opacity-100 transition-opacity"
                onClick={() => insertBlock(idx, 'paragraph')}
              >
                Click to add text
              </div>
            ) : null;
            const ghostBlock = (aiGhost && aiGhost.index === idx) ? (
              <div key={`ghost-${block.id}`} className="flex items-start gap-2 relative my-1">
                <div className="w-5 shrink-0" />
                <div className="flex-1 px-3 py-2 bg-[#1e1e1e] border border-green-600/40 border-l-4 border-l-green-500 rounded text-gray-200 whitespace-pre-wrap">
                  {aiGhost.content}
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={acceptAIGhost} className="px-2 py-1 text-xs bg-green-600 hover:bg-green-500 text-white rounded">Accept</button>
                  <button onClick={() => setAiGhost(null)} className="px-2 py-1 text-xs bg-[#2a2a2a] hover:bg-[#333] text-gray-200 rounded">Reject</button>
                </div>
              </div>
            ) : null;
            const nodes: React.ReactNode[] = [blockNode];
            if (ghostBlock) nodes.push(ghostBlock);
            if (clickToAdd) nodes.push(clickToAdd);
            return nodes;
          })}
        </div>
        <div className="h-32" />
      </div>
    </div>
  );
}

function isAtBlockStart(el: HTMLElement) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (!range.collapsed) return false;

  // Empty blocks are always at start
  if (!el.textContent || el.textContent === '\n') return true;

  try {
    const pre = document.createRange();
    pre.selectNodeContents(el);
    pre.setEnd(range.endContainer, range.endOffset);
    return pre.toString().length === 0;
  } catch {
    return range.startOffset === 0;
  }
}

function isAtBlockEnd(el: HTMLElement) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (!range.collapsed) return false;

  // Empty blocks are always at end
  if (!el.textContent || el.textContent === '\n') return true;

  try {
    const post = document.createRange();
    post.selectNodeContents(el);
    post.setStart(range.startContainer, range.startOffset);
    return post.toString().length === 0;
  } catch {
    return false;
  }
}

function placeCaretAtEnd(el: HTMLElement | null) {
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

function focusBlockStart(el: HTMLElement | null) {
  if (!el) return;
  if (el.tagName === 'TEXTAREA') {
    const ta = el as HTMLTextAreaElement;
    ta.focus();
    ta.selectionStart = ta.selectionEnd = 0;
  } else {
    el.focus();
    const range = document.createRange();
    if (!el.childNodes.length) {
      const br = document.createElement('br');
      el.appendChild(br);
      range.setStartBefore(br);
      range.collapse(true);
    } else {
      range.selectNodeContents(el);
      range.collapse(true);
    }
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }
}

function focusBlockEnd(el: HTMLElement | null) {
  if (!el) return;
  if (el.tagName === 'TEXTAREA') {
    const ta = el as HTMLTextAreaElement;
    ta.focus();
    ta.selectionStart = ta.selectionEnd = ta.value.length;
  } else {
    el.focus();
    placeCaretAtEnd(el);
  }
}
