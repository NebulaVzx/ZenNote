import type { Page, Block, SearchResult, SyncConfig, AIConfig, AIGenerateRequest } from '../types';


const BASE = 'http://localhost:8080';

async function fetchJSON<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + input, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listPages: () => fetchJSON<Page[]>('/api/pages'),
  createPage: (title: string, parentId?: string) =>
    fetchJSON<{ id: string }>('/api/pages', {
      method: 'POST',
      body: JSON.stringify({ title, parent_id: parentId }),
    }),
  getPage: (id: string) => fetchJSON<Page>(`/api/pages/${id}`),
  updatePage: (id: string, payload: { title?: string; icon?: string }) =>
    fetchJSON<{ ok: boolean }>(`/api/pages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  reorderPages: (pages: Page[]) =>
    fetchJSON<{ ok: boolean }>('/api/pages/reorder', {
      method: 'PUT',
      body: JSON.stringify(pages),
    }),
  deletePage: (id: string) =>
    fetchJSON<{ ok: boolean }>(`/api/pages/${id}`, { method: 'DELETE' }),
  listTrash: () => fetchJSON<Page[]>('/api/pages/trash'),
  restorePage: (id: string) =>
    fetchJSON<{ ok: boolean }>(`/api/pages/${id}/restore`, { method: 'PUT' }),
  permanentDeletePage: (id: string) =>
    fetchJSON<{ ok: boolean }>(`/api/pages/${id}/permanent`, { method: 'DELETE' }),
  getBlocks: (id: string) => fetchJSON<Block[]>(`/api/pages/${id}/blocks`),
  updateBlocks: (id: string, blocks: Block[]) =>
    fetchJSON<{ ok: boolean }>(`/api/pages/${id}/blocks`, {
      method: 'PUT',
      body: JSON.stringify(blocks),
    }),
  search: (q: string) => fetchJSON<SearchResult[]>(`/api/search?q=${encodeURIComponent(q)}`),
  getSyncConfig: () => fetchJSON<{ config: SyncConfig | null }>('/api/sync/config'),
  updateSyncConfig: (cfg: Partial<SyncConfig>) =>
    fetchJSON<{ ok: boolean }>('/api/sync/config', {
      method: 'PUT',
      body: JSON.stringify(cfg),
    }),
  testSyncConnection: (cfg: Partial<SyncConfig>) =>
    fetchJSON<{ ok: boolean }>('/api/sync/config/test', {
      method: 'POST',
      body: JSON.stringify(cfg),
    }),
  triggerUpload: () => fetchJSON<{ ok: boolean }>('/api/sync/upload', { method: 'POST' }),
  triggerDownload: () => fetchJSON<{ ok: boolean }>('/api/sync/download', { method: 'POST' }),
  listAIConfigs: () => fetchJSON<AIConfig[]>('/api/ai_configs'),
  createAIConfig: (payload: Partial<AIConfig>) =>
    fetchJSON<{ id: string }>('/api/ai_configs', { method: 'POST', body: JSON.stringify(payload) }),
  updateAIConfig: (id: string, payload: Partial<AIConfig>) =>
    fetchJSON<{ ok: boolean }>(`/api/ai_configs/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteAIConfig: (id: string) =>
    fetchJSON<{ ok: boolean }>(`/api/ai_configs/${id}`, { method: 'DELETE' }),
  testAIConfig: (id: string) =>
    fetchJSON<{ ok: boolean; message?: string }>(`/api/ai_configs/${id}/test`, { method: 'POST' }),
  generateAI: (payload: AIGenerateRequest) =>
    fetchJSON<{ content: string }>('/api/ai/generate', { method: 'POST', body: JSON.stringify(payload) }),
  toggleFavorite: (id: string, isFavorite: number) =>
    fetchJSON<{ ok: boolean }>(`/api/pages/${id}/favorite`, {
      method: 'PUT',
      body: JSON.stringify({ is_favorite: isFavorite }),
    }),
};
