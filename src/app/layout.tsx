import type { Metadata } from 'next';
import './globals.css';
import { UpdateNotification } from '@/components/UpdateNotification';
import { ClientShell } from '@/components/ui/ClientShell';

export const metadata: Metadata = {
  title: 'Aria Coach',
  description: 'Dashboard quotidien et assistant stratégique connecté à Microsoft 365',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <ClientShell>
          {children}
        </ClientShell>
        <UpdateNotification />
      </body>
    </html>
  );
}
