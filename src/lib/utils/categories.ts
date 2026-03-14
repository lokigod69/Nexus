import { CategoryDefinition, Category } from '@/types';

export const CATEGORIES: CategoryDefinition[] = [
  { id: 'prompts', label: 'Prompts', icon: '\u2726', color: '#ff6bff' },
  { id: 'coding', label: 'Coding', icon: '\u27E8\u27E9', color: '#00d4ff' },
  { id: 'ai-art', label: 'AI Art', icon: '\u25D0', color: '#a855f7' },
  { id: 'video', label: 'Video', icon: '\u25B6', color: '#ff4444' },
  { id: 'tools', label: 'Tools', icon: '\u2699', color: '#ffa500' },
  { id: 'philosophy', label: 'Philosophy', icon: '\u221E', color: '#7b8aff' },
  { id: 'music', label: 'Music', icon: '\u266B', color: '#00ffcc' },
  { id: 'lifestyle', label: 'Lifestyle', icon: '\u25C9', color: '#ffcc00' },
  { id: 'learning', label: 'Learning', icon: '\uD83D\uDCDA', color: '#4ade80' },
  { id: 'other', label: 'Other', icon: '\u25C7', color: '#666666' },
];

export function getCategoryById(id: string): CategoryDefinition {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}

export function getCategoryColor(id: string): string {
  return getCategoryById(id).color;
}
