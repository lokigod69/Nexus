'use client';

import type { BookRefData } from '@/types';

export function BookCard({ book }: { book: BookRefData }) {
  if (!book) return null;

  const content = (
    <div className="flex items-start gap-3 bg-elevated border border-border-subtle rounded-lg p-3">
      {book.coverUrl && (
        <img
          src={book.coverUrl}
          alt={`Cover of ${book.title}`}
          width={80}
          className="rounded shadow-sm shrink-0 object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <h5 className="text-xs font-sans font-semibold text-text-primary leading-tight">
          {book.title}
        </h5>
        {book.author && (
          <p className="text-xs text-text-secondary mt-0.5">{book.author}</p>
        )}
        {book.firstPublishYear && (
          <p className="text-xs text-text-muted mt-0.5">{book.firstPublishYear}</p>
        )}
      </div>
    </div>
  );

  if (book.openLibraryKey) {
    return (
      <a
        href={`https://openlibrary.org${book.openLibraryKey}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block hover:opacity-80 transition-opacity"
      >
        {content}
      </a>
    );
  }

  return content;
}
