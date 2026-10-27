import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { FeedbackProvider } from '../components/Feedback';

export const metadata: Metadata = {
  title: 'Mediqo',
  description: 'Find and book verified doctors, hospitals and clinics near you.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <FeedbackProvider>{children}</FeedbackProvider>
      </body>
    </html>
  );
}
