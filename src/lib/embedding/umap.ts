import { UMAP } from 'umap-js';
import { blobToVector } from './provider';

interface SignalWithEmbedding {
  id: string;
  embedding: Buffer | null;
  category: string;
}

export function computePositions(
  signals: SignalWithEmbedding[]
): Map<string, { x: number; y: number; z: number }> {
  const withEmbeddings = signals.filter((s) => s.embedding);

  if (withEmbeddings.length < 5) {
    return fallbackPositions(withEmbeddings);
  }

  const vectors = withEmbeddings.map((s) => blobToVector(s.embedding!));

  try {
    const umap = new UMAP({
      nComponents: 3,
      nNeighbors: Math.max(2, Math.min(15, Math.floor(vectors.length / 2))),
      minDist: 0.1,
      spread: 1.5,
    });

    const positions3D = umap.fit(vectors);
    const scale = 50;
    const result = new Map<string, { x: number; y: number; z: number }>();

    positions3D.forEach((pos: number[], i: number) => {
      result.set(withEmbeddings[i].id, {
        x: pos[0] * scale,
        y: pos[1] * scale,
        z: pos[2] * scale,
      });
    });

    return result;
  } catch (err) {
    console.error('UMAP fit failed, using fallback positions:', err);
    return fallbackPositions(withEmbeddings);
  }
}

function fallbackPositions(
  signals: SignalWithEmbedding[]
): Map<string, { x: number; y: number; z: number }> {
  const categoryAngles: Record<string, number> = {};
  let angleStep = 0;

  const result = new Map<string, { x: number; y: number; z: number }>();
  const radius = 30;

  signals.forEach((signal) => {
    if (!(signal.category in categoryAngles)) {
      categoryAngles[signal.category] = angleStep;
      angleStep += (2 * Math.PI) / 10;
    }

    const angle = categoryAngles[signal.category];
    const jitter = (Math.random() - 0.5) * 10;

    result.set(signal.id, {
      x: Math.cos(angle) * radius + jitter,
      y: (Math.random() - 0.5) * 20,
      z: Math.sin(angle) * radius + jitter,
    });
  });

  return result;
}
