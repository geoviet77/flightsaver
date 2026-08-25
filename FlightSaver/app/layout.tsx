import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FlightSaver — Умный поиск перелётов одной фразой | Split-Ticketing',
  description: 'Минималистичный ИИ-поиск авиабилетов. Экономия до 40-60% за счет умной стыковки и раздельной выписки сегментов (Split-Ticketing). Голосовой ввод и мгновенный расчет.',
  keywords: 'авиабилеты, дешевые билеты, split-ticketing, раздельная выписка, умный поиск билетов, голосовой поиск, STPC отель',
  authors: [{ name: 'FlightSaver Team' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 3,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="scroll-smooth">
      <body
        className="antialiased min-h-screen text-slate-900"
        style={{
          background: 'linear-gradient(180deg, #f0f7ff 0%, #e1effe 35%, #ebf4ff 70%, #f8fafc 100%)',
          minHeight: '100vh',
          fontFamily: "var(--font-main)",
        }}
      >
        {children}
      </body>
    </html>
  );
}
