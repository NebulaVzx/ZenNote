import type { Block, Page } from '../types';

function parseProps(props?: string): Record<string, any> {
  try {
    if (props) return JSON.parse(props);
  } catch {}
  return {};
}

function escapeHtml(html: string): string {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

function blockToHTML(block: Block): string {
  const props = parseProps(block.props);
  const content = block.content || '';

  switch (block.type) {
    case 'paragraph':
      return `<p>${content}</p>`;

    case 'heading': {
      const level = Math.min(Math.max(props.level || 1, 1), 3);
      return `<h${level}>${content}</h${level}>`;
    }

    case 'bullet_list':
      return `<ul><li>${content}</li></ul>`;

    case 'numbered_list':
      return `<ol><li>${content}</li></ol>`;

    case 'todo_list': {
      const checked = props.checked ? 'checked' : '';
      return `<ul class="todo-list"><li><input type="checkbox" ${checked} disabled> ${content}</li></ul>`;
    }

    case 'quote':
      return `<blockquote>${content}</blockquote>`;

    case 'code': {
      const lang = props.language || '';
      const text = content.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<p>/gi, '');
      const escaped = escapeHtml(text);
      return `<pre><code${lang ? ` class="language-${lang}"` : ''}>${escaped}</code></pre>`;
    }

    case 'divider':
      return '<hr>';

    case 'toggle': {
      const lines = content.split(/<br\s*\/?>|\n/);
      const summary = lines[0] || 'Toggle';
      const details = lines.slice(1).join('<br>');
      return `<details><summary>${summary}</summary><div class="toggle-content">${details}</div></details>`;
    }

    case 'image': {
      const src = props.src || '';
      const alt = props.alt || '';
      return `<figure><img src="${src}" alt="${alt}"><figcaption>${content}</figcaption></figure>`;
    }

    default:
      return `<p>${content}</p>`;
  }
}

export function generatePageHTML(page: Page, blocks: Block[]): string {
  const blocksHTML = blocks.map(blockToHTML).join('\n');
  const title = page.title || 'Untitled';
  const icon = page.icon || '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
:root {
  --bg: #ffffff;
  --text: #1f1f1f;
  --text-secondary: #5f6368;
  --border: #e0e0e0;
  --code-bg: #f5f5f5;
  --quote-border: #3b82f6;
  --link: #3b82f6;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #191919;
    --text: #e3e3e3;
    --text-secondary: #9ca3af;
    --border: #2f2f2f;
    --code-bg: #202020;
    --quote-border: #60a5fa;
    --link: #60a5fa;
  }
}
* { box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.7;
  max-width: 720px;
  margin: 0 auto;
  padding: 48px 24px;
  transition: background 0.2s, color 0.2s;
}
h1, h2, h3 {
  font-weight: 600;
  margin: 1.5em 0 0.5em;
  line-height: 1.3;
}
h1 { font-size: 1.8em; margin-top: 0; }
h2 { font-size: 1.4em; }
h3 { font-size: 1.15em; }
p { margin: 0.6em 0; }
ul, ol { padding-left: 1.5em; margin: 0.6em 0; }
li { margin: 0.2em 0; }
.todo-list { list-style: none; padding-left: 0; }
.todo-list li { display: flex; align-items: flex-start; gap: 0.4em; }
.todo-list input { margin-top: 0.35em; }
blockquote {
  border-left: 3px solid var(--quote-border);
  padding-left: 1em;
  margin: 1em 0;
  color: var(--text-secondary);
}
pre {
  background: var(--code-bg);
  border-radius: 6px;
  padding: 12px 16px;
  overflow-x: auto;
  margin: 1em 0;
}
code {
  font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace;
  font-size: 0.9em;
}
pre code { background: none; padding: 0; }
hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 1.5em 0;
}
details {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 12px 16px;
  margin: 0.8em 0;
}
summary {
  font-weight: 500;
  cursor: pointer;
  outline: none;
}
.toggle-content { margin-top: 0.5em; }
figure { margin: 1em 0; }
img { max-width: 100%; border-radius: 6px; }
figcaption {
  text-align: center;
  font-size: 0.85em;
  color: var(--text-secondary);
  margin-top: 0.3em;
}
a { color: var(--link); text-decoration: none; }
a:hover { text-decoration: underline; }
.page-title { font-size: 2em; font-weight: 700; margin-bottom: 0.3em; }
.page-meta { color: var(--text-secondary); font-size: 0.85em; margin-bottom: 2em; }
</style>
</head>
<body>
<div class="page-title">${icon} ${escapeHtml(title)}</div>
<div class="page-meta">Exported from ZenNote</div>
${blocksHTML}
</body>
</html>`;
}
