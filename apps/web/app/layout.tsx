import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'my-startup-template',
  description: 'Powered by BMAD. Customize me in apps/web/app/layout.tsx.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
