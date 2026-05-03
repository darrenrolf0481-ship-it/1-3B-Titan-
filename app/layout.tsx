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
  title: 'NEXUS // Paranormal Investigation Platform',
  description: 'A sophisticated dashboard for paranormal investigation, featuring sensor monitoring, spectral analysis, and AI-powered anomaly detection.',
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
