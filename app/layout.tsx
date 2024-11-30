import '@/app/ui/global.css';
import { inter } from '@/app/ui/fonts';

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | TCG Dashboard',
    default: 'TCG Dashboard',
  },
  description:
    'Dashboard example for invoices and customers built with nextjs App Router',
  metadataBase: new URL('https://dasboard.tcglabs.id'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
