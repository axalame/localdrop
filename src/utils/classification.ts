import { isImageFile, extractFirstUrl } from './formatters.ts';

export type ContentType = 'text' | 'rich_text' | 'image' | 'file';
export type TagType = 'link' | 'code' | 'image';

export interface ClassificationResult {
  contentType: ContentType;
  tags: TagType[];
}

const CODE_PATTERNS = [
  /function\s+\w+\s*\(/i,
  /const\s+\w+\s*=\s*/,
  /let\s+\w+\s*=\s*/,
  /var\s+\w+\s*=\s*/,
  /import\s+.*\s+from\s+['"].*['"]/i,
  /export\s+(default\s+)?(function|class|const|interface|type)\s+/i,
  /^\s*\{\s*["'][^"']+["']\s*:/m, // JSON-like object
  /SELECT\s+.*\s+FROM\s+/i,
  /<[a-z][\s\S]*>.*<\/[a-z][\s\S]*>/i, // HTML / XML / JSX
  /fn\s+\w+\s*\(/, // Rust fn
  /impl\s+.*\s+for\s+/i, // Rust impl
  /def\s+\w+\s*\(.*?\):/i, // Python def
];

export function isCodeSnippet(text: string): boolean {
  if (!text || text.length < 5) return false;
  return CODE_PATTERNS.some((pattern) => pattern.test(text));
}

export function classifyContent(
  content: string,
  itemType: 'clipboard' | 'file'
): ClassificationResult {
  if (itemType === 'file') {
    if (isImageFile(content)) {
      return {
        contentType: 'image',
        tags: ['image'],
      };
    }
    return {
      contentType: 'file',
      tags: [],
    };
  }

  const tags: TagType[] = [];

  if (extractFirstUrl(content)) {
    tags.push('link');
  }

  const isCode = isCodeSnippet(content);
  if (isCode) {
    tags.push('code');
  }

  const lineCount = (content.match(/\n/g) || []).length + 1;
  const isRich = isCode || lineCount >= 3 || content.startsWith('#') || content.startsWith('```');

  return {
    contentType: isRich ? 'rich_text' : 'text',
    tags,
  };
}
