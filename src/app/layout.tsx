import type { Metadata } from 'next';
import './globals.css';
import { UpdateNotification } from '@/components/UpdateNotification';

export const metadata: Metadata = {
  title: 'Aria Coach',
  description: 'Dashboard quotidien et assistant stratégique connecté à Microsoft 365',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {children}
        <UpdateNotification />
      </body>
    </html>
  );
}
