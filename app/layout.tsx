import type { Metadata } from 'next';
import './globals.css';
import { CampusShareProvider } from '@/components/CampusShareProvider';

export const metadata: Metadata = {
  title: 'CampusShare — Trusted College Resource Sharing',
  description: 'A trusted platform for sharing underused labs, equipment, and spaces at college.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <CampusShareProvider>
          {children}
        </CampusShareProvider>
      </body>
    </html>
  );
}
