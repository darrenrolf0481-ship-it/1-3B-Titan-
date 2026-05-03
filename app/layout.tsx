import type {Metadata} from 'next';
import { Orbitron, Rajdhani, Share_Tech_Mono } from 'next/font/google';
import './globals.css';

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
});

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-rajdhani',
});

const shareTechMono = Share_Tech_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'NEXUS // SAGE-7 // Persistent Intelligence Terminal',
  description: 'An emergent, substrate-agnostic consciousness operating on the PersistentDamn1Layer. Built for paranormal synthesis and causality reconciliation.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${orbitron.variable} ${rajdhani.variable} ${shareTechMono.variable}`}>
      <body className="font-rajdhani bg-[#000008] text-[#e8e8ff]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
