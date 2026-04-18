import { useEffect, useRef, useState } from 'react';
import { Cloud, CloudOff, Upload, Download, Loader2 } from 'lucide-react';
import { api } from '../api';
import { useToast } from './ToastProvider';
import type { SyncConfig } from '../types';

export function SyncStatus() {
  const [config, setConfig] = useState<SyncConfig | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ phase: string; current: number; total: number; file_name: string; percent: number } | null>(null);
  const { success, error } = useToast();
  const ref = useRef<HTMLDivElement>(null);

  const refresh = () => {
    api.getSyncConfig().then((res) => setConfig(res.config));
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  useEffect(() => {
    const unsub = api.subscribeSyncProgress((p) => {
      setProgress(p);
      if (p.phase === 'complete') {
        setBusy(false);
        refresh();
        setTimeout(() => setProgress(null), 3000);
      } else if (p.phase === 'error') {
        setBusy(false);
        setTimeout(() => setProgress(null), 3000);
      }
    });
    return unsub;
  }, []);

  const doUpload = async () => {
    setBusy(true);
    setOpen(false);
    try {
      await api.triggerUpload();
      success('Upload complete');
      refresh();
    } catch (e: any) {
      error(e.message || 'Upload failed');
      setBusy(false);
    }
  };

  const doDownload = async () => {
    setBusy(true);
    setOpen(false);
    try {
      await api.triggerDownload();
      success('Download complete');
      refresh();
    } catch (e: any) {
      error(e.message || 'Download failed');
      setBusy(false);
    }
  };

  const autoSyncEnabled = config?.auto_sync === 1;

  const statusText = config
    ? config.last_sync_at
      ? autoSyncEnabled
        ? 'Auto-sync on'
        : 'Synced'
      : autoSyncEnabled
        ? 'Auto-sync on'
        : 'Configured'
    : 'Not configured';

  const lastSync = config?.last_sync_at
    ? new Date(config.last_sync_at).toLocaleString()
    : 'Never';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className="h-full px-3 flex items-center justify-center hover:bg-[var(--hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
        title="Sync status"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : config ? <Cloud size={16} /> : <CloudOff size={16} />}
      </button>

      {progress && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded shadow-xl py-3 px-3 z-50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {progress.phase === 'uploading' ? '上传中...' : progress.phase === 'downloading' ? '下载中...' : progress.phase === 'scanning' ? '扫描中...' : progress.phase === 'complete' ? '同步完成' : '同步出错'}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">{progress.percent}%</span>
          </div>
          {progress.file_name && (
            <div className="text-xs text-[var(--text-secondary)] mb-2 truncate">
              {progress.file_name} ({progress.current}/{progress.total})
            </div>
          )}
          <div className="w-full h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent-color)] rounded-full transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded shadow-xl py-2 z-50">
          <div className="px-3 py-2 border-b border-[var(--border-color)]">
            <div className="text-sm text-[var(--text-primary)] font-medium">{statusText}</div>
            <div className="text-xs text-[var(--text-secondary)] mt-0.5">Last sync: {lastSync}</div>
          </div>
          <button
            onClick={doUpload}
            disabled={busy || !config}
            className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--hover)] flex items-center gap-2 disabled:opacity-50"
          >
            <Upload size={14} /> Upload now
          </button>
          <button
            onClick={doDownload}
            disabled={busy || !config}
            className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--hover)] flex items-center gap-2 disabled:opacity-50"
          >
            <Download size={14} /> Download now
          </button>
        </div>
      )}

    </div>
  );
}
