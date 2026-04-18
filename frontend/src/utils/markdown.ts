import type { Block, BlockType } from '../types';

interface ParseResult {
  frontmatter: Record<string, any>;
  blocks: Block[];
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function parseMarkdown(content: string, pageId: string): ParseResult {
  const frontmatter: Record<string, any> = {};
  let body = content;

  // Extract frontmatter
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (fmMatch) {
    const fmText = fmMatch[1];
    body = content.slice(fmMatch[0].length);
    // Simple YAML parsing (key: value pairs)
    fmText.split('\n').forEach((line) => {
      const match = line.match(/^([\w_]+):\s*(.*)$/);
      if (match) {
        const key = match[1];
        let value: any = match[2].trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        // Try parse as number
        if (/^-?\d+$/.test(value)) {
          value = parseInt(value, 10);
        } else if (/^-?\d+\.\d+$/.test(value)) {
          value = parseFloat(value);
        } else if (value === 'true') {
          value = true;
        } else if (value === 'false') {
          value = false;
        }
        frontmatter[key] = value;
      }
    });
  }

  const lines = body.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  function addBlock(type: BlockType, content: string, props?: Record<string, any>) {
    blocks.push({
      id: generateId('block'),
      page_id: pageId,
      type,
      content,
      props: JSON.stringify(props || {}),
      parent_id: '',
      sort_order: blocks.length,
      created_at: Date.now(),
      updated_at: Date.now(),
    });
  }

  while (i < lines.length) {
    const line = lines[i];

    // Empty line skip (but not between paragraphs)
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Fenced code block
    const codeMatch = line.match(/^```(\w+)?\s*$/);
    if (codeMatch) {
      const lang = codeMatch[1] || 'text';
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].match(/^```\s*$/)) {
        codeLines.push(lines[i]);
        i++;
      }
      addBlock('code', codeLines.join('\n'), { language: lang });
      i++;
      continue;
    }

    // Divider
    if (line.match(/^(---|\*\*\*|___)\s*$/)) {
      addBlock('divider', '');
      i++;
      continue;
    }

    // Image
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (imgMatch) {
      addBlock('image', imgMatch[1], { src: imgMatch[2] });
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      addBlock('heading', headingMatch[2], { level });
      i++;
      continue;
    }

    // Todo list
    const todoMatch = line.match(/^-\s+\[([ x])\]\s+(.+)$/);
    if (todoMatch) {
      addBlock('todo_list', todoMatch[2], { checked: todoMatch[1] === 'x' });
      i++;
      continue;
    }

    // Bullet list
    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      addBlock('bullet_list', bulletMatch[1]);
      i++;
      continue;
    }

    // Numbered list
    const numberedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (numberedMatch) {
      addBlock('numbered_list', numberedMatch[1]);
      i++;
      continue;
    }

    // Quote
    const quoteMatch = line.match(/^>\s?(.+)$/);
    if (quoteMatch) {
      // Collect consecutive quote lines
      const quoteLines: string[] = [quoteMatch[1]];
      i++;
      while (i < lines.length) {
        const qm = lines[i].match(/^>\s?(.+)$/);
        if (qm) {
          quoteLines.push(qm[1]);
          i++;
        } else {
          break;
        }
      }
      addBlock('quote', quoteLines.join('\n'));
      continue;
    }

    // Toggle (simple heuristic: >? or summary/details)
    const toggleMatch = line.match(/^&gt;\s+(.+)$/);
    if (toggleMatch) {
      addBlock('toggle', toggleMatch[1], { expanded: false });
      i++;
      continue;
    }

    // Paragraph (default) — collect consecutive non-empty, non-special lines
    const paraLines: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== '' && !isSpecialLine(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    addBlock('paragraph', paraLines.join('\n'));
  }

  if (blocks.length === 0) {
    addBlock('paragraph', '');
  }

  return { frontmatter, blocks };
}

function isSpecialLine(line: string): boolean {
  return !!(
    line.match(/^#{1,3}\s+/) ||
    line.match(/^[-*]\s+/) ||
    line.match(/^\d+\.\s+/) ||
    line.match(/^>\s?/) ||
    line.match(/^```/) ||
    line.match(/^!(?:\[([^\]]*)\])\(([^)]+)\)/) ||
    line.match(/^(---|\*\*\*|___)\s*$/)
  );
}

export function generateMarkdown(blocks: Block[], frontmatter?: Record<string, any>): string {
  const parts: string[] = [];

  // Frontmatter
  if (frontmatter && Object.keys(frontmatter).length > 0) {
    parts.push('---');
    for (const [key, value] of Object.entries(frontmatter)) {
      if (typeof value === 'string') {
        parts.push(`${key}: "${value}"`);
      } else {
        parts.push(`${key}: ${value}`);
      }
    }
    parts.push('---');
    parts.push('');
  }

  for (const block of blocks) {
    const props = JSON.parse(block.props || '{}');
    switch (block.type) {
      case 'heading': {
        const level = props.level || 1;
        const prefix = '#'.repeat(Math.min(level, 3));
        parts.push(`${prefix} ${block.content}`);
        break;
      }
      case 'bullet_list':
        parts.push(`- ${block.content}`);
        break;
      case 'numbered_list':
        parts.push(`1. ${block.content}`);
        break;
      case 'todo_list': {
        const checked = props.checked ? 'x' : ' ';
        parts.push(`- [${checked}] ${block.content}`);
        break;
      }
      case 'code': {
        const lang = props.language || 'text';
        parts.push(`\`\`\`${lang}`);
        parts.push(block.content);
        parts.push('```');
        break;
      }
      case 'quote':
        parts.push(...block.content.split('\n').map((l) => `> ${l}`));
        break;
      case 'divider':
        parts.push('---');
        break;
      case 'image': {
        const src = props.src || '';
        parts.push(`![${block.content}](${src})`);
        break;
      }
      case 'toggle':
        parts.push(`> ${block.content}`);
        break;
      case 'paragraph':
      default:
        parts.push(block.content);
        break;
    }
  }

  return parts.join('\n\n');
}
