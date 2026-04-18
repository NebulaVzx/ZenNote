import { FileText, BookOpen, CalendarDays, Users } from 'lucide-react';
import type { Block, BlockType } from '../types';

interface Template {
  key: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  blocks: Omit<Block, 'id' | 'page_id' | 'sort_order' | 'created_at' | 'updated_at'>[];
}

function generateId(prefix: string): string {
  return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

export function createTemplateBlocks(templateKey: string, pageId: string): Block[] {
  const template = TEMPLATES.find((t) => t.key === templateKey);
  if (!template) return [];
  return template.blocks.map((b, i) => ({
    ...b,
    id: generateId('block'),
    page_id: pageId,
    sort_order: i,
    created_at: Date.now(),
    updated_at: Date.now(),
  })) as Block[];
}

export const TEMPLATES: Template[] = [
  {
    key: 'blank',
    label: '空白页',
    icon: <FileText size={28} className="text-blue-400" />,
    description: '从一张白纸开始创作',
    blocks: [
      { type: 'paragraph' as BlockType, content: '', props: '{}' },
    ],
  },
  {
    key: 'journal',
    label: '日记',
    icon: <CalendarDays size={28} className="text-green-400" />,
    description: '记录每一天的所思所感',
    blocks: [
      { type: 'heading' as BlockType, content: '日记', props: JSON.stringify({ level: 1 }) },
      { type: 'paragraph' as BlockType, content: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }), props: '{}' },
      { type: 'divider' as BlockType, content: '', props: '{}' },
      { type: 'paragraph' as BlockType, content: '', props: '{}' },
    ],
  },
  {
    key: 'reading',
    label: '读书笔记',
    icon: <BookOpen size={28} className="text-amber-400" />,
    description: '记录阅读中的灵感与摘录',
    blocks: [
      { type: 'heading' as BlockType, content: '读书笔记', props: JSON.stringify({ level: 1 }) },
      { type: 'paragraph' as BlockType, content: '<b>书名：</b>', props: '{}' },
      { type: 'paragraph' as BlockType, content: '<b>作者：</b>', props: '{}' },
      { type: 'divider' as BlockType, content: '', props: '{}' },
      { type: 'quote' as BlockType, content: '精彩摘录...', props: '{}' },
      { type: 'paragraph' as BlockType, content: '<b>感悟：</b>', props: '{}' },
      { type: 'bullet_list' as BlockType, content: '要点 1', props: '{}' },
      { type: 'bullet_list' as BlockType, content: '要点 2', props: '{}' },
    ],
  },
  {
    key: 'meeting',
    label: '会议记录',
    icon: <Users size={28} className="text-purple-400" />,
    description: '高效记录会议内容与待办',
    blocks: [
      { type: 'heading' as BlockType, content: '会议记录', props: JSON.stringify({ level: 1 }) },
      { type: 'paragraph' as BlockType, content: `<b>时间：</b>${new Date().toLocaleDateString('zh-CN')}`, props: '{}' },
      { type: 'paragraph' as BlockType, content: '<b>参会人：</b>', props: '{}' },
      { type: 'divider' as BlockType, content: '', props: '{}' },
      { type: 'heading' as BlockType, content: '讨论内容', props: JSON.stringify({ level: 2 }) },
      { type: 'paragraph' as BlockType, content: '', props: '{}' },
      { type: 'heading' as BlockType, content: '行动项', props: JSON.stringify({ level: 2 }) },
      { type: 'todo_list' as BlockType, content: '待办事项 1', props: JSON.stringify({ checked: false }) },
      { type: 'todo_list' as BlockType, content: '待办事项 2', props: JSON.stringify({ checked: false }) },
    ],
  },
];

interface WelcomeScreenProps {
  onSelectTemplate: (templateKey: string) => void;
  onSkip: () => void;
}

export function WelcomeScreen({ onSelectTemplate, onSkip }: WelcomeScreenProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 px-4">
      <div className="text-5xl mb-3">📝</div>
      <div className="text-xl font-medium text-gray-200 mb-1">欢迎使用 ZenNote</div>
      <div className="text-sm text-gray-500 mb-8">选择一个模板开始你的笔记之旅</div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
        {TEMPLATES.map((t) => (
          <button
            key={t.key}
            onClick={() => onSelectTemplate(t.key)}
            className="flex flex-col items-start gap-2 p-4 rounded-lg border border-[#2a2a2a] bg-[#1e1e1e] hover:border-blue-500/50 hover:bg-[#252525] transition-all text-left"
          >
            <div className="p-2 bg-[#2a2a2a] rounded-lg">{t.icon}</div>
            <div className="text-sm font-medium text-gray-200">{t.label}</div>
            <div className="text-xs text-gray-500">{t.description}</div>
          </button>
        ))}
      </div>

      <button
        onClick={onSkip}
        className="mt-6 text-sm text-gray-500 hover:text-gray-300 transition-colors"
      >
        跳过，从空白页开始
      </button>
    </div>
  );
}
