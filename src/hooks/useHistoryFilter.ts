import { useState, useMemo } from 'react';
import type { HistoryItem, ContentType, TagType, ConnectedClient } from '../types';
import { filterHistoryItems } from '../utils/filterHistory';
import { classifyContent } from '../utils/classification';

export function useHistoryFilter(
  history: HistoryItem[],
  clients: ConnectedClient[] = []
) {
  const [activeCategory, setActiveCategory] = useState<'all' | 'favorites'>('all');
  const [selectedType, setSelectedType] = useState<'all' | ContentType>('all');
  const [selectedTag, setSelectedTag] = useState<'all' | TagType>('all');
  const [selectedSource, setSelectedSource] = useState<'all' | string>('all');
  const [selectedTime, setSelectedTime] = useState<'all' | 'today' | 'yesterday' | 'week'>('all');
  const [search, setSearch] = useState('');

  // 1. Available sources extracted dynamically from history and active connected clients
  const availableSources = useMemo(() => {
    const set = new Set<string>();
    for (const item of history) {
      if (item.device_name && item.device_name.trim()) {
        set.add(item.device_name.trim());
      }
    }
    for (const c of clients) {
      if (c.device_name && c.device_name.trim()) {
        set.add(c.device_name.trim());
      }
    }
    return Array.from(set);
  }, [history, clients]);

  // 2. Counts for badges in sidebar
  const counts = useMemo(() => {
    let all = history.length;
    let favorites = 0;
    let text = 0;
    let rich_text = 0;
    let image = 0;
    let file = 0;
    let link = 0;
    let code = 0;

    for (const item of history) {
      if (item.is_favorite) favorites++;

      const cType = item.content_type || classifyContent(item.content, item.item_type).contentType;
      const tags = item.tags || classifyContent(item.content, item.item_type).tags;

      if (cType === 'text') text++;
      else if (cType === 'rich_text') rich_text++;
      else if (cType === 'image') image++;
      else if (cType === 'file') file++;

      if (tags.includes('link')) link++;
      if (tags.includes('code')) code++;
    }

    return { all, favorites, text, rich_text, image, file, link, code };
  }, [history]);

  // 3. Filtered history items
  const filteredHistory = useMemo(() => {
    return filterHistoryItems(history, {
      category: activeCategory,
      type: selectedType,
      tag: selectedTag,
      source: selectedSource,
      time: selectedTime,
      search,
    });
  }, [history, activeCategory, selectedType, selectedTag, selectedSource, selectedTime, search]);

  const handleSelectCategory = (cat: 'all' | 'favorites') => {
    setActiveCategory(cat);
    // When switching between All and Favorites, reset sub-filters to show full set
    setSelectedType('all');
    setSelectedTag('all');
  };

  const handleSelectType = (t: 'all' | ContentType) => {
    setSelectedType((prev) => (prev === t ? 'all' : t));
    setSelectedTag('all');
  };

  const handleSelectTag = (t: 'all' | TagType) => {
    setSelectedTag((prev) => (prev === t ? 'all' : t));
    setSelectedType('all');
  };

  const handleSelectSource = (s: 'all' | string) => {
    setSelectedSource((prev) => (prev === s ? 'all' : s));
  };

  const handleSelectTime = (t: 'all' | 'today' | 'yesterday' | 'week') => {
    setSelectedTime((prev) => (prev === t ? 'all' : t));
  };

  return {
    activeCategory,
    selectedType,
    selectedTag,
    selectedSource,
    selectedTime,
    search,
    setSearch,
    counts,
    availableSources,
    filteredHistory,
    handleSelectCategory,
    handleSelectType,
    handleSelectTag,
    handleSelectSource,
    handleSelectTime,
  };
}
