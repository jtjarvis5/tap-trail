export default function manifest() {
  return {
    name: 'Tap Trail',
    short_name: 'Tap Trail',
    description: 'A journal of every pint, everywhere you drink it.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0e0b09',
    theme_color: '#0e0b09',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
