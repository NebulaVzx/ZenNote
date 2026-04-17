export interface Page {
  id: string;
  parent_id?: string;
  title: string;
  icon?: string;
  sort_order: number;
  is_favorite?: number;
  created_at: number;
  updated_at: number;
  deleted_at?: number;
}

export interface Block {
  id: string;
  page_id: string;
  type: BlockType;
  content: string;
  props?: string;
  parent_id?: string;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'bullet_list'
  | 'numbered_list'
  | 'todo_list'
  | 'code'
  | 'toggle'
  | 'quote'
  | 'divider';

export interface Tab {
  pageId: string;
  title: string;
}

export interface SearchResult {
  page_id: string;
  page_title: string;
  block_id: string;
  content: string;
  highlights: string;
}

export interface SyncConfig {
  id: string;
  workspace_id: string;
  provider: string;
  endpoint: string;
  region: string;
  bucket: string;
  prefix: string;
  access_key_id: string;
  secret_access_key: string;
  auto_sync: number;
  sync_interval: number;
  last_sync_at: number;
  created_at: number;
  updated_at: number;
}

export interface AIConfig {
  id: string;
  workspace_id: string;
  name: string;
  provider: string;
  api_key: string;
  base_url: string;
  model: string;
  temperature: number;
  max_tokens: number;
  is_default: number;
  created_at: number;
  updated_at: number;
}

export type AIAction = 'continue' | 'polish' | 'translate' | 'explain';

export interface AIGenerateRequest {
  prompt: string;
  action: AIAction;
  language?: string;
  config_id?: string;
}
