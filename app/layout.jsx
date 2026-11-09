import './globals.css';

export const metadata = {
  title: 'Tap Trail',
  description: 'A journal of every pint, everywhere you drink it.',
  appleWebApp: { capable: true, title: 'Tap Trail', statusBarStyle: 'black-translucent' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0e0b09',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
