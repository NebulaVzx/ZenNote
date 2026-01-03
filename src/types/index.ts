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
