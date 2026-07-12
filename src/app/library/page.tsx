import type { Metadata } from 'next';
import { LibraryScreen } from '@/components/library/LibraryScreen';

export const metadata: Metadata = {
  title: 'Library — Nexus',
};

export default function LibraryPage() {
  return <LibraryScreen />;
}
