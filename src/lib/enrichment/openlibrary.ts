import type { BookRefData } from '@/types';

/**
 * Fetch book metadata from Open Library.
 */
export async function fetchBookData(title: string, author?: string): Promise<BookRefData | null> {
  try {
    const query = author ? `${title} ${author}` : title;
    const response = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=1`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) return null;
    const data = await response.json();

    if (!data.docs?.length) return null;
    const book = data.docs[0];

    return {
      title: book.title,
      author: book.author_name?.[0] || null,
      firstPublishYear: book.first_publish_year || null,
      coverId: book.cover_i || null,
      coverUrl: book.cover_i
        ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
        : null,
      openLibraryKey: book.key || null,
      subjects: book.subject?.slice(0, 5) || null,
    };
  } catch {
    return null;
  }
}
