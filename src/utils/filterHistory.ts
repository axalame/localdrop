import type { HistoryItem, ContentType, TagType } from '../types';
import { classifyContent } from './classification.ts';

export interface FilterOptions {
  category?: 'all' | 'favorites';
  type?: 'all' | ContentType;
  tag?: 'all' | TagType;
  source?: 'all' | string;
  time?: 'all' | 'today' | 'yesterday' | 'week';
  search?: string;
}

export function filterHistoryItems(
  items: HistoryItem[],
  options: FilterOptions
): HistoryItem[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400 * 1000;
  const startOfWeek = startOfToday - 7 * 86400 * 1000;

  return items.filter((item) => {
    // Fill in content_type and tags dynamically if missing from legacy records
    const itemContentType = item.content_type || classifyContent(item.content, item.item_type).contentType;
    const itemTags = item.tags || classifyContent(item.content, item.item_type).tags;

    // 1. Category (All vs Favorites)
    if (options.category === 'favorites' && !item.is_favorite) {
      return false;
    }

    // 2. Type
    if (options.type && options.type !== 'all') {
      if (itemContentType !== options.type) {
        return false;
      }
    }

    // 3. Tag
    if (options.tag && options.tag !== 'all') {
      if (!itemTags.includes(options.tag)) {
        return false;
      }
    }

    // 4. Source
    if (options.source && options.source !== 'all') {
      const matchDevice = item.device_name === options.source;
      const matchDirection =
        (options.source.toLowerCase().includes('windows') && item.direction === 'win_to_ios') ||
        (options.source.toLowerCase().includes('ios') && item.direction === 'ios_to_win');
      if (!matchDevice && !matchDirection) {
        return false;
      }
    }

    // 5. Time
    if (options.time && options.time !== 'all') {
      if (options.time === 'today' && item.timestamp < startOfToday) {
        return false;
      }
      if (
        options.time === 'yesterday' &&
        (item.timestamp < startOfYesterday || item.timestamp >= startOfToday)
      ) {
        return false;
      }
      if (options.time === 'week' && item.timestamp < startOfWeek) {
        return false;
      }
    }

    // 6. Search query
    if (options.search && options.search.trim()) {
      const query = options.search.toLowerCase().trim();
      if (!item.content.toLowerCase().includes(query)) {
        return false;
      }
    }

    return true;
  });
}
