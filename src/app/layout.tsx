import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const outfit = localFont({ src: '../assets/fonts/Outfit-Variable.ttf', variable: '--font-outfit', weight: '100 900' });
const manrope = localFont({ src: '../assets/fonts/Manrope-Variable.ttf', variable: '--font-manrope', weight: '200 800' });

// Outfit and Manrope have no ₦ sign, so this supplies it rather than leaving it to each device's fonts.
const nairaSign = localFont({
  src: [
    { path: '../assets/fonts/naira-500.woff2', weight: '500' },
    { path: '../assets/fonts/naira-700.woff2', weight: '700' },
  ],
  variable: '--font-naira',
  declarations: [{ prop: 'unicode-range', value: 'U+20A6' }],
});

export const metadata: Metadata = {
  title: { default: 'Haki', template: '%s · Haki' },
  description: 'Murabaha financing with a fixed price.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${manrope.variable} ${nairaSign.variable}`}>
      <body>{children}</body>
    </html>
  );
}
