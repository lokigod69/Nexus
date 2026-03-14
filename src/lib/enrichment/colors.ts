import type { PaletteData } from '@/types';

/**
 * Generate a color palette from Colormind.
 * NOTE: Colormind is HTTP only — must be called server-side.
 */
export async function generatePalette(): Promise<PaletteData | null> {
  try {
    const response = await fetch('http://colormind.io/api/', {
      method: 'POST',
      body: JSON.stringify({ model: 'default' }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;
    const data = await response.json();

    if (!data.result) return null;

    const colors = data.result.map(
      ([r, g, b]: [number, number, number]) =>
        `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
    );

    return { colors };
  } catch {
    return null;
  }
}
