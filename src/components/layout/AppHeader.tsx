'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Inbox, LibraryBig } from 'lucide-react';
import { useCaptureStore } from '@/stores/captureStore';
import { MuteToggle } from './MuteToggle';

/**
 * The only translucent chrome in the app — content genuinely scrolls
 * beneath it. Identical on every screen for spatial consistency.
 */
export function AppHeader() {
  const pathname = usePathname();
  const count = useCaptureStore((s) => s.captures.length);
  const loaded = useCaptureStore((s) => s.inboxLoaded);
  const onInbox = pathname === '/inbox';
  const onLibrary = pathname === '/library';

  return (
    <header className="chrome sticky top-0 z-40">
      <div className="relative mx-auto flex h-14 w-full max-w-[640px] items-center justify-between px-5">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2.5 rounded-lg"
          aria-label="Nexus — capture"
        >
          <span aria-hidden className="h-2 w-2 rounded-full bg-accent" />
          <span className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
            Nexus
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <MuteToggle />
          <Link
            href="/inbox"
            className={`flex h-11 items-center gap-2 rounded-lg px-3 text-[14px] font-medium ${
              onInbox
                ? 'bg-elevated text-ink'
                : 'text-ink-secondary hover:bg-elevated hover:text-ink'
            }`}
          >
            <Inbox size={16} aria-hidden />
            <span>Inbox</span>
            {loaded && count > 0 && (
              <span className="rounded-md bg-accent/15 px-1.5 py-0.5 font-mono text-xs leading-none text-accent-strong">
                {count}
              </span>
            )}
          </Link>
          <Link
            href="/library"
            className={`flex h-11 items-center gap-2 rounded-lg px-3 text-[14px] font-medium ${
              onLibrary
                ? 'bg-elevated text-ink'
                : 'text-ink-secondary hover:bg-elevated hover:text-ink'
            }`}
          >
            <LibraryBig size={16} aria-hidden />
            <span>Library</span>
          </Link>
        </nav>
        <div className="chrome-edge" aria-hidden />
      </div>
    </header>
  );
}
