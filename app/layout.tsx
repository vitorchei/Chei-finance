import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import BottomNav from '@/components/BottomNav'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Finanças Pessoais',
  description: 'Controle financeiro pessoal',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} font-sans bg-[#0a0a0a] text-white min-h-screen`}>
        <main className="pb-24 max-w-lg mx-auto min-h-screen">{children}</main>
        <BottomNav />
      </body>
    </html>
  )
}
