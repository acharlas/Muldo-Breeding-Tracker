import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Muldo Tracker',
  description: 'Muldo breeding tracker for Dofus',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body>{children}</body>
    </html>
  )
}
