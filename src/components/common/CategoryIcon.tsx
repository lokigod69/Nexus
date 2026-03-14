'use client';

import { getCategoryById } from '@/lib/utils/categories';

export function CategoryIcon({ category, size = 'md' }: { category: string; size?: 'sm' | 'md' | 'lg' }) {
  const cat = getCategoryById(category);
  const sizeClasses = { sm: 'text-xs', md: 'text-sm', lg: 'text-lg' };
  return (
    <span className={sizeClasses[size]} style={{ color: cat.color }}>
      {cat.icon}
    </span>
  );
}
