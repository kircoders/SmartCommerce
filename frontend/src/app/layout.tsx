// Phase 1

// WHAT THIS FILE IS:
// The root layout — the outer shell that wraps every single page in the app.
// In Next.js App Router, layout.tsx is special: it stays mounted while you
// navigate between pages, only the inner content (children) changes.
//
// WHY IT EXISTS:
// We need MUI (Material UI) to be set up once for the whole app, not on every
// individual page. This is the right place to do that.
//
// WHAT IT DOES:
// - AppRouterCacheProvider: makes MUI work correctly with Next.js App Router
// - CssBaseline: resets default browser styles (removes default margins,
//   standardizes fonts, etc.) so MUI components look consistent everywhere

import type { Metadata } from 'next';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import CssBaseline from '@mui/material/CssBaseline';
import './globals.css';

export const metadata: Metadata = {
  title: 'SmartCommerce',
  description: 'SmartCommerce Operations Platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider>
          <CssBaseline />
          {children}
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
