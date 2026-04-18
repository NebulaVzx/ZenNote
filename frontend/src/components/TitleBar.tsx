import { useState, useRef, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X, Settings, PanelLeft, Download, Upload, FileCode } from 'lucide-react';
import { SyncStatus } from './SyncStatus';

interface TitleBarProps {
  onSettings?: () => void;
  onToggleSidebar?: () => void;
  onOpenMarkdown?: () => void;
  onExportMarkdown?: () => void;
  onExportHTML?: () => void;
}

export function TitleBar({ onSettings, onToggleSidebar, onOpenMarkdown, onExportMarkdown, onExportHTML }: TitleBarProps) {
  let appWindow: ReturnType<typeof getCurrentWindow> | undefined;
  try {
    appWindow = getCurrentWindow();
  } catch {
    // Not running inside Tauri (e.g. browser dev)
  }

  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const fileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setFileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div
      data-tauri-drag-region
      className="h-10 flex items-center justify-between select-none bg-[var(--bg-secondary)] border-b border-[var(--border-color)]"
    >
      <div className="flex items-center gap-2 px-4" data-tauri-drag-region>
        <span className="text-sm font-medium text-[var(--text-primary)]">ZenNote</span>
        <span className="text-xs text-[var(--text-secondary)]">|</span>
        <span className="text-xs text-[var(--text-secondary)]">My Workspace</span>
        <div className="relative ml-2" ref={fileMenuRef}>
          <button
            onClick={() => setFileMenuOpen((v) => !v)}
            className="px-2 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded transition-colors"
          >
            File
          </button>
          {fileMenuOpen && (
            <div className="absolute left-0 top-full mt-1 w-52 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded shadow-xl py-1 z-50">
              <button
                onClick={() => { setFileMenuOpen(false); onOpenMarkdown?.(); }}
                className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2"
              >
                <Upload size={14} /> Open Markdown File...
              </button>
              <button
                onClick={() => { setFileMenuOpen(false); onExportMarkdown?.(); }}
                className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2"
              >
                <Download size={14} /> Export as Markdown...
              </button>
              <button
                onClick={() => { setFileMenuOpen(false); onExportHTML?.(); }}
                className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2"
              >
                <FileCode size={14} /> Export as HTML...
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center h-full">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="h-full px-3 flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title="Toggle sidebar"
          >
            <PanelLeft size={16} />
          </button>
        )}
        <SyncStatus />
        {onSettings && (
          <button
            onClick={onSettings}
            className="h-full px-3 flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title="Settings"
          >
            <Settings size={16} />
          </button>
        )}
        <button
          onClick={() => appWindow?.minimize()}
          className="h-full px-4 flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={() => appWindow?.toggleMaximize()}
          className="h-full px-4 flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Square size={14} />
        </button>
        <button
          onClick={() => appWindow?.close()}
          className="h-full px-4 flex items-center justify-center hover:bg-red-600 text-[var(--text-secondary)] hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
