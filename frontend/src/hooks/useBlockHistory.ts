import { useRef, useCallback, useMemo } from 'react';
import type { Block } from '../types';

const MAX_HISTORY = 50;

export interface BlockHistory {
  push: (blocks: Block[]) => void;
  undo: () => Block[] | null;
  redo: () => Block[] | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

export function useBlockHistory(): BlockHistory {
  const historyRef = useRef<Block[][]>([]);
  const indexRef = useRef(-1);
  const restoringRef = useRef(false);

  const push = useCallback((blocks: Block[]) => {
    if (restoringRef.current) return;
    const snapshot = blocks.map((b) => ({ ...b }));
    const next = historyRef.current.slice(0, indexRef.current + 1);
    next.push(snapshot);
    if (next.length > MAX_HISTORY) next.shift();
    historyRef.current = next;
    indexRef.current = next.length - 1;
  }, []);

  const undo = useCallback(() => {
    if (indexRef.current <= 0) return null;
    indexRef.current--;
    restoringRef.current = true;
    const result = historyRef.current[indexRef.current].map((b) => ({ ...b }));
    requestAnimationFrame(() => {
      restoringRef.current = false;
    });
    return result;
  }, []);

  const redo = useCallback(() => {
    if (indexRef.current >= historyRef.current.length - 1) return null;
    indexRef.current++;
    restoringRef.current = true;
    const result = historyRef.current[indexRef.current].map((b) => ({ ...b }));
    requestAnimationFrame(() => {
      restoringRef.current = false;
    });
    return result;
  }, []);

  const canUndo = useCallback(() => indexRef.current > 0, []);
  const canRedo = useCallback(() => indexRef.current < historyRef.current.length - 1, []);

  const clear = useCallback(() => {
    historyRef.current = [];
    indexRef.current = -1;
  }, []);

  return useMemo(
    () => ({ push, undo, redo, canUndo, canRedo, clear }),
    [push, undo, redo, canUndo, canRedo, clear]
  );
}
