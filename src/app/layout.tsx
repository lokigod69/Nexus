import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono, Outfit } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { SoundProvider } from '@/components/sound/SoundProvider';
import './globals.css';

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Nexus',
  description:
    'The front door to your Second Brain — capture a link or a thought, route it to the right project.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon-192.png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Nexus',
  },
};

export const viewport: Viewport = {
  themeColor: '#08080d',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${outfit.variable} ${jetbrainsMono.variable} bg-void font-sans text-ink antialiased`}
      >
        <SoundProvider />
        {children}
        {/* Errors only — success is always shown in-card, never toasted. */}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#12121e',
              color: '#ece9e2',
              border: '1px solid #2d2a38',
              borderRadius: '10px',
              fontSize: '14px',
              fontFamily: 'var(--font-outfit), system-ui, sans-serif',
            },
            error: {
              iconTheme: { primary: '#e5645a', secondary: '#12121e' },
            },
          }}
        />
      </body>
    </html>
  );
}
