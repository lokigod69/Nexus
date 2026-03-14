import type { Metadata } from 'next';
import { JetBrains_Mono, Outfit } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { EnrichmentProvider } from '@/components/enrichment/EnrichmentProvider';
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
  title: 'Nexus — Knowledge Reactor',
  description: 'Capture signals from the noise, understand them with AI, navigate your collected intelligence.',
  icons: {
    icon: { url: '/favicon.svg', type: 'image/svg+xml' },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${outfit.variable} ${jetbrainsMono.variable} font-sans antialiased bg-void text-text-primary`}>
        <EnrichmentProvider>
          {children}
        </EnrichmentProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#12121e',
              color: '#e0e0e0',
              border: '1px solid #1a1a2e',
              fontSize: '14px',
              fontFamily: 'var(--font-mono)',
            },
            success: { iconTheme: { primary: '#00ffa3', secondary: '#12121e' } },
            error: { iconTheme: { primary: '#ff4444', secondary: '#12121e' } },
          }}
        />
      </body>
    </html>
  );
}
