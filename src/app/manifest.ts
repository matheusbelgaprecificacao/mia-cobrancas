import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cobranças · Mia Utilidades',
    short_name: 'Cobranças',
    description: 'Controle de cobranças, juros e lembretes',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#F7F5F0',
    theme_color: '#1A1C22',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
