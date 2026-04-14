import type { Page, Block, SearchResult, SyncConfig } from '../types';


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
  updatePage: (id: string, title: string) =>
    fetchJSON<{ ok: boolean }>(`/api/pages/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title }),
    }),
  reorderPages: (pages: Page[]) =>
    fetchJSON<{ ok: boolean }>('/api/pages/reorder', {
      method: 'PUT',
      body: JSON.stringify(pages),
    }),
  deletePage: (id: string) =>
    fetchJSON<{ ok: boolean }>(`/api/pages/${id}`, { method: 'DELETE' }),
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
};
