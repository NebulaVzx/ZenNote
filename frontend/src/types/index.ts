export interface Page {
  id: string;
  parent_id?: string;
  title: string;
  icon?: string;
  sort_order: number;
  created_at: number;
  updated_at: number;
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
