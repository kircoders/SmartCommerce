// Phase 1

// WHAT THIS FILE IS:
// The root page of the app — what loads when someone visits http://localhost:3001.
// It has no UI at all. Its only job is to immediately redirect the user to /login.
//
// WHY IT EXISTS:
// Next.js requires a page.tsx at the root. Rather than showing a blank page,
// we redirect straight to login so the user always lands somewhere useful.

import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/login');
}
