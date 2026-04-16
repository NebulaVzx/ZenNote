import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X, Settings, PanelLeft } from 'lucide-react';
import { SyncStatus } from './SyncStatus';

interface TitleBarProps {
  onSettings?: () => void;
  onToggleSidebar?: () => void;
}

export function TitleBar({ onSettings, onToggleSidebar }: TitleBarProps) {
  let appWindow: ReturnType<typeof getCurrentWindow> | undefined;
  try {
    appWindow = getCurrentWindow();
  } catch {
    // Not running inside Tauri (e.g. browser dev)
  }

  return (
    <div
      data-tauri-drag-region
      className="h-10 flex items-center justify-between select-none bg-[#202020] border-b border-[#2f2f2f]"
    >
      <div className="flex items-center gap-2 px-4" data-tauri-drag-region>
        <span className="text-sm font-medium text-gray-200">ZenNote</span>
        <span className="text-xs text-gray-500">|</span>
        <span className="text-xs text-gray-400">My Workspace</span>
      </div>
      <div className="flex items-center h-full">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="h-full px-3 flex items-center justify-center hover:bg-[#2a2a2a] text-gray-400 hover:text-gray-200 transition-colors"
            title="Toggle sidebar"
          >
            <PanelLeft size={16} />
          </button>
        )}
        <SyncStatus />
        {onSettings && (
          <button
            onClick={onSettings}
            className="h-full px-3 flex items-center justify-center hover:bg-[#2a2a2a] text-gray-400 hover:text-gray-200 transition-colors"
            title="Settings"
          >
            <Settings size={16} />
          </button>
        )}
        <button
          onClick={() => appWindow?.minimize()}
          className="h-full px-4 flex items-center justify-center hover:bg-[#2a2a2a] text-gray-400 hover:text-gray-200 transition-colors"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={() => appWindow?.toggleMaximize()}
          className="h-full px-4 flex items-center justify-center hover:bg-[#2a2a2a] text-gray-400 hover:text-gray-200 transition-colors"
        >
          <Square size={14} />
        </button>
        <button
          onClick={() => appWindow?.close()}
          className="h-full px-4 flex items-center justify-center hover:bg-red-600 text-gray-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
