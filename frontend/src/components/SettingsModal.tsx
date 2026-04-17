import { useEffect, useState } from 'react';
import { X, Cloud } from 'lucide-react';
import { api } from '../api';
import type { SyncConfig } from '../types';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [config, setConfig] = useState<Partial<SyncConfig>>({
    provider: 's3',
    endpoint: '',
    region: '',
    bucket: '',
    prefix: '',
    access_key_id: '',
    secret_access_key: '',
    auto_sync: 1,
    sync_interval: 300,
  });
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState('');
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    if (!open) return;
    api.getSyncConfig().then((res) => {
      if (res.config) {
        setConfig(res.config);
      }
    });
    setTestStatus('idle');
    setTestMsg('');
    setSaveMsg('');
  }, [open]);

  const update = (field: keyof SyncConfig, value: string | number) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleTest = async () => {
    setLoading(true);
    setTestStatus('idle');
    try {
      await api.testSyncConnection(config);
      setTestStatus('success');
      setTestMsg('Connection successful');
    } catch (e: any) {
      setTestStatus('error');
      setTestMsg(e.message || 'Connection failed');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.updateSyncConfig(config);
      setSaveMsg('Settings saved');
    } catch (e: any) {
      setSaveMsg(e.message || 'Save failed');
    }
    setLoading(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-[#1e1e1e] rounded-lg border border-[#333] shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-gray-200">
            <Cloud size={18} />
            <h2 className="text-base font-medium">Cloud Sync Settings</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Endpoint (optional for AWS)</label>
            <input
              type="text"
              value={config.endpoint || ''}
              onChange={(e) => update('endpoint', e.target.value)}
              placeholder="https://s3.amazonaws.com"
              className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Region</label>
              <input
                type="text"
                value={config.region || ''}
                onChange={(e) => update('region', e.target.value)}
                placeholder="us-east-1"
                className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded text-sm text-gray-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Bucket</label>
              <input
                type="text"
                value={config.bucket || ''}
                onChange={(e) => update('bucket', e.target.value)}
                placeholder="my-bucket"
                className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded text-sm text-gray-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Prefix</label>
            <input
              type="text"
              value={config.prefix || ''}
              onChange={(e) => update('prefix', e.target.value)}
              placeholder="zennote/desktop"
              className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Access Key ID</label>
            <input
              type="text"
              value={config.access_key_id || ''}
              onChange={(e) => update('access_key_id', e.target.value)}
              className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Secret Access Key</label>
            <input
              type="password"
              value={config.secret_access_key || ''}
              onChange={(e) => update('secret_access_key', e.target.value)}
              className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={!!config.auto_sync}
                onChange={(e) => update('auto_sync', e.target.checked ? 1 : 0)}
                className="rounded border-gray-500"
              />
              Auto sync
            </label>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Interval (seconds)</label>
            <input
              type="number"
              min={60}
              value={config.sync_interval || 300}
              onChange={(e) => update('sync_interval', parseInt(e.target.value, 10) || 300)}
              className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {testMsg && (
          <div className={`mt-3 text-xs ${testStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            {testMsg}
          </div>
        )}
        {saveMsg && (
          <div className={`mt-3 text-xs ${saveMsg.includes('saved') ? 'text-green-400' : 'text-red-400'}`}>
            {saveMsg}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={handleTest}
            disabled={loading}
            className="px-4 py-2 text-sm rounded bg-[#2a2a2a] text-gray-200 hover:bg-[#333] disabled:opacity-50"
          >
            Test Connection
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
          >
            Save
          </button>
        </div>
        <div className="mt-4 text-center text-xs text-gray-500">ZenNote v0.2.5</div>
      </div>
    </div>
  );
}
