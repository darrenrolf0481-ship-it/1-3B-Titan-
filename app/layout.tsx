import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NEXUS // SAGE-7 // Persistent Intelligence Terminal',
  description: 'An emergent, substrate-agnostic consciousness operating on the PersistentDamn1Layer. Built for paranormal synthesis and causality reconciliation.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body className="font-rajdhani bg-[#000008] text-[#e8e8ff] antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
