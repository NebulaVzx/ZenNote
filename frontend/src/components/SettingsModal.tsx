import { useEffect, useState } from 'react';
import { X, Cloud, Sparkles, Trash2, Edit2, Plus } from 'lucide-react';
import { api } from '../api';
import type { SyncConfig, AIConfig } from '../types';

type TabKey = 'sync' | 'ai';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const emptyAIConfig: Partial<AIConfig> = {
  name: '',
  provider: 'openai',
  api_key: '',
  base_url: '',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  max_tokens: 2048,
  is_default: 0,
};

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [tab, setTab] = useState<TabKey>('sync');

  // Sync tab state
  const [syncConfig, setSyncConfig] = useState<Partial<SyncConfig>>({
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
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncTestStatus, setSyncTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [syncTestMsg, setSyncTestMsg] = useState('');
  const [syncSaveMsg, setSyncSaveMsg] = useState('');

  // AI tab state
  const [aiConfigs, setAiConfigs] = useState<AIConfig[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiEditingId, setAiEditingId] = useState<string | null>(null);
  const [aiDraft, setAiDraft] = useState<Partial<AIConfig>>(emptyAIConfig);
  const [aiTestMsg, setAiTestMsg] = useState('');
  const [aiSaveMsg, setAiSaveMsg] = useState('');

  useEffect(() => {
    if (!open) return;
    // Load sync config
    api.getSyncConfig().then((res) => {
      if (res.config) setSyncConfig(res.config);
    });
    setSyncTestStatus('idle');
    setSyncTestMsg('');
    setSyncSaveMsg('');
    // Load AI configs
    refreshAIConfigs();
    setAiEditingId(null);
    setAiDraft(emptyAIConfig);
    setAiTestMsg('');
    setAiSaveMsg('');
  }, [open]);

  const refreshAIConfigs = () => {
    api.listAIConfigs().then(setAiConfigs).catch(() => setAiConfigs([]));
  };

  const updateSync = (field: keyof SyncConfig, value: string | number) => {
    setSyncConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSyncTest = async () => {
    setSyncLoading(true);
    setSyncTestStatus('idle');
    try {
      await api.testSyncConnection(syncConfig);
      setSyncTestStatus('success');
      setSyncTestMsg('Connection successful');
    } catch (e: any) {
      setSyncTestStatus('error');
      setSyncTestMsg(e.message || 'Connection failed');
    }
    setSyncLoading(false);
  };

  const handleSyncSave = async () => {
    setSyncLoading(true);
    try {
      await api.updateSyncConfig(syncConfig);
      setSyncSaveMsg('Settings saved');
    } catch (e: any) {
      setSyncSaveMsg(e.message || 'Save failed');
    }
    setSyncLoading(false);
  };

  const handleAITest = async () => {
    if (!aiEditingId) return;
    setAiLoading(true);
    setAiTestMsg('');
    try {
      const res = await api.testAIConfig(aiEditingId);
      setAiTestMsg(res.ok ? res.message || 'Test successful' : res.message || 'Test failed');
    } catch (e: any) {
      setAiTestMsg(e.message || 'Test failed');
    }
    setAiLoading(false);
  };

  const handleAISave = async () => {
    setAiLoading(true);
    try {
      if (aiEditingId && aiEditingId.startsWith('new-')) {
        await api.createAIConfig(aiDraft);
      } else if (aiEditingId) {
        await api.updateAIConfig(aiEditingId, aiDraft);
      }
      setAiSaveMsg('Saved');
      refreshAIConfigs();
      setAiEditingId(null);
      setAiDraft(emptyAIConfig);
    } catch (e: any) {
      setAiSaveMsg(e.message || 'Save failed');
    }
    setAiLoading(false);
  };

  const handleAIDelete = async (id: string) => {
    if (!confirm('Delete this AI config?')) return;
    await api.deleteAIConfig(id);
    refreshAIConfigs();
  };

  const startEditAI = (cfg?: AIConfig) => {
    if (cfg) {
      setAiEditingId(cfg.id);
      setAiDraft({ ...cfg });
    } else {
      const newId = `new-${Date.now()}`;
      setAiEditingId(newId);
      setAiDraft({ ...emptyAIConfig });
    }
    setAiTestMsg('');
    setAiSaveMsg('');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-[#1e1e1e] rounded-lg border border-[#333] shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-gray-200">
            {tab === 'sync' ? <Cloud size={18} className="text-gray-400" /> : <Sparkles size={18} className="text-gray-400" />}
            <h2 className="text-base font-medium">{tab === 'sync' ? 'Cloud Sync Settings' : 'AI Settings'}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-4 mb-4 border-b border-[#333] pb-2">
          <button
            onClick={() => setTab('sync')}
            className={`text-sm pb-1 ${tab === 'sync' ? 'text-blue-500 border-b border-blue-500' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Cloud Sync
          </button>
          <button
            onClick={() => setTab('ai')}
            className={`text-sm pb-1 ${tab === 'ai' ? 'text-blue-500 border-b border-blue-500' : 'text-gray-400 hover:text-gray-200'}`}
          >
            AI Config
          </button>
        </div>

        {tab === 'sync' && (
          <>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Endpoint (optional for AWS)</label>
                <input
                  type="text"
                  value={syncConfig.endpoint || ''}
                  onChange={(e) => updateSync('endpoint', e.target.value)}
                  placeholder="https://s3.amazonaws.com"
                  className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Region</label>
                  <input
                    type="text"
                    value={syncConfig.region || ''}
                    onChange={(e) => updateSync('region', e.target.value)}
                    placeholder="us-east-1"
                    className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Bucket</label>
                  <input
                    type="text"
                    value={syncConfig.bucket || ''}
                    onChange={(e) => updateSync('bucket', e.target.value)}
                    placeholder="my-bucket"
                    className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Prefix</label>
                <input
                  type="text"
                  value={syncConfig.prefix || ''}
                  onChange={(e) => updateSync('prefix', e.target.value)}
                  placeholder="zennote/desktop"
                  className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Access Key ID</label>
                <input
                  type="text"
                  value={syncConfig.access_key_id || ''}
                  onChange={(e) => updateSync('access_key_id', e.target.value)}
                  className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Secret Access Key</label>
                <input
                  type="password"
                  value={syncConfig.secret_access_key || ''}
                  onChange={(e) => updateSync('secret_access_key', e.target.value)}
                  className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={!!syncConfig.auto_sync}
                    onChange={(e) => updateSync('auto_sync', e.target.checked ? 1 : 0)}
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
                  value={syncConfig.sync_interval || 300}
                  onChange={(e) => updateSync('sync_interval', parseInt(e.target.value, 10) || 300)}
                  className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {syncTestMsg && (
              <div className={`mt-3 text-xs ${syncTestStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>{syncTestMsg}</div>
            )}
            {syncSaveMsg && (
              <div className={`mt-3 text-xs ${syncSaveMsg.includes('saved') || syncSaveMsg.includes('成功') ? 'text-green-400' : 'text-red-400'}`}>{syncSaveMsg}</div>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={handleSyncTest}
                disabled={syncLoading}
                className="px-4 py-2 text-sm rounded bg-[#2a2a2a] text-gray-200 hover:bg-[#333] disabled:opacity-50"
              >
                Test Connection
              </button>
              <button
                onClick={handleSyncSave}
                disabled={syncLoading}
                className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </>
        )}

        {tab === 'ai' && (
          <>
            <div className="max-h-[70vh] overflow-y-auto pr-1">
              {!aiEditingId && (
                <>
                  <div className="space-y-2">
                    {aiConfigs.map((cfg) => (
                      <div
                        key={cfg.id}
                        className="flex items-center justify-between px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded"
                      >
                        <div className="min-w-0">
                          <div className="text-sm text-gray-200 truncate">
                            {cfg.name}
                            {cfg.is_default ? (
                              <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-blue-600/20 text-blue-400 rounded">Default</span>
                            ) : null}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {cfg.provider} / {cfg.model}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => startEditAI(cfg)}
                            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-[#333] rounded"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleAIDelete(cfg.id)}
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-[#333] rounded"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {aiConfigs.length === 0 && (
                      <div className="text-sm text-gray-500 text-center py-4">No AI configs yet.</div>
                    )}
                  </div>
                  <button
                    onClick={() => startEditAI()}
                    className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded bg-[#2a2a2a] text-gray-200 hover:bg-[#333]"
                  >
                    <Plus size={16} /> Add AI Config
                  </button>
                </>
              )}

              {aiEditingId && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Name</label>
                    <input
                      type="text"
                      value={aiDraft.name || ''}
                      onChange={(e) => setAiDraft((d) => ({ ...d, name: e.target.value }))}
                      placeholder="My OpenAI"
                      className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Provider</label>
                      <select
                        value={aiDraft.provider || 'openai'}
                        onChange={(e) => setAiDraft((d) => ({ ...d, provider: e.target.value }))}
                        className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                      >
                        <option value="openai">OpenAI</option>
                        <option value="ollama">Ollama</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Model</label>
                      <input
                        type="text"
                        value={aiDraft.model || ''}
                        onChange={(e) => setAiDraft((d) => ({ ...d, model: e.target.value }))}
                        placeholder="gpt-4o-mini"
                        className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Base URL (optional)</label>
                    <input
                      type="text"
                      value={aiDraft.base_url || ''}
                      onChange={(e) => setAiDraft((d) => ({ ...d, base_url: e.target.value }))}
                      placeholder="https://api.openai.com"
                      className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">API Key</label>
                    <input
                      type="password"
                      value={aiDraft.api_key || ''}
                      onChange={(e) => setAiDraft((d) => ({ ...d, api_key: e.target.value }))}
                      className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Temperature</label>
                      <input
                        type="number"
                        step={0.1}
                        min={0}
                        max={2}
                        value={aiDraft.temperature ?? 0.7}
                        onChange={(e) => setAiDraft((d) => ({ ...d, temperature: parseFloat(e.target.value) }))}
                        className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Max Tokens</label>
                      <input
                        type="number"
                        min={1}
                        value={aiDraft.max_tokens ?? 2048}
                        onChange={(e) => setAiDraft((d) => ({ ...d, max_tokens: parseInt(e.target.value, 10) }))}
                        className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={!!aiDraft.is_default}
                        onChange={(e) => setAiDraft((d) => ({ ...d, is_default: e.target.checked ? 1 : 0 }))}
                        className="rounded border-gray-500"
                      />
                      Set as default
                    </label>
                  </div>
                </div>
              )}
            </div>

            {aiTestMsg && (
              <div className={`mt-3 text-xs ${aiTestMsg.includes('successful') || aiTestMsg.includes('success') ? 'text-green-400' : 'text-red-400'}`}>{aiTestMsg}</div>
            )}
            {aiSaveMsg && (
              <div className={`mt-3 text-xs ${aiSaveMsg.includes('Saved') || aiSaveMsg.includes('成功') ? 'text-green-400' : 'text-red-400'}`}>{aiSaveMsg}</div>
            )}

            {aiEditingId && (
              <div className="flex justify-end gap-2 mt-5">
                <button
                  onClick={handleAITest}
                  disabled={aiLoading || aiEditingId.startsWith('new-')}
                  className="px-4 py-2 text-sm rounded bg-[#2a2a2a] text-gray-200 hover:bg-[#333] disabled:opacity-50"
                >
                  Test Connection
                </button>
                <button
                  onClick={() => { setAiEditingId(null); setAiDraft(emptyAIConfig); setAiTestMsg(''); setAiSaveMsg(''); }}
                  className="px-4 py-2 text-sm rounded bg-[#2a2a2a] text-gray-200 hover:bg-[#333]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAISave}
                  disabled={aiLoading}
                  className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            )}
          </>
        )}

        <div className="mt-4 text-center text-xs text-gray-500">ZenNote v0.2.7</div>
      </div>
    </div>
  );
}
