import type { Metadata } from 'next';
import { Manrope, Space_Grotesk } from 'next/font/google';
import '@/app/globals.css';
import { Providers } from '@/app/providers';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin']
});

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin']
});

export const metadata: Metadata = {
  title: 'TalkFluent | Real-time English Practice Rooms',
  description: 'Join live voice rooms for English practice and language exchange.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${manrope.variable} ${spaceGrotesk.variable}`}>
      <body className="font-[var(--font-manrope)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
