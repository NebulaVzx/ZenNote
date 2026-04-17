import { useEffect, useRef, useState } from 'react';
import { Cloud, CloudOff, Upload, Download, Loader2 } from 'lucide-react';
import { api } from '../api';
import { useToast } from './ToastProvider';
import type { SyncConfig } from '../types';

export function SyncStatus() {
  const [config, setConfig] = useState<SyncConfig | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
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

  const doUpload = async () => {
    setBusy(true);
    setOpen(false);
    try {
      await api.triggerUpload();
      success('Upload complete');
      refresh();
    } catch (e: any) {
      error(e.message || 'Upload failed');
    }
    setBusy(false);
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
    }
    setBusy(false);
  };

  const statusText = config
    ? config.last_sync_at
      ? 'Synced'
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
        className="h-full px-3 flex items-center justify-center hover:bg-[#2a2a2a] text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50"
        title="Sync status"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : config ? <Cloud size={16} /> : <CloudOff size={16} />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-[#1e1e1e] border border-[#333] rounded shadow-xl py-2 z-50">
          <div className="px-3 py-2 border-b border-[#333]">
            <div className="text-sm text-gray-200 font-medium">{statusText}</div>
            <div className="text-xs text-gray-500 mt-0.5">Last sync: {lastSync}</div>
          </div>
          <button
            onClick={doUpload}
            disabled={busy || !config}
            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#2a2a2a] flex items-center gap-2 disabled:opacity-50"
          >
            <Upload size={14} /> Upload now
          </button>
          <button
            onClick={doDownload}
            disabled={busy || !config}
            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#2a2a2a] flex items-center gap-2 disabled:opacity-50"
          >
            <Download size={14} /> Download now
          </button>
        </div>
      )}

    </div>
  );
}
