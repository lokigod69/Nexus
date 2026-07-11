import type { Metadata } from 'next';
import { InboxScreen } from '@/components/inbox/InboxScreen';

export const metadata: Metadata = {
  title: 'Inbox — Nexus',
};

export default function InboxPage() {
  return <InboxScreen />;
}
