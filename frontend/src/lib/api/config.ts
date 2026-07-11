// Phase 2

// WHAT THIS FILE IS:
// The single source of truth for which backend the frontend talks to.
// Every file in lib/api/ imports API_URL from here instead of declaring
// its own copy - so switching backends means changing one value in one
// place, not four.
//
// HOW TO POINT AT YOUR LOCAL BACKEND INSTEAD OF THE DEPLOYED ONE:
// Create a file called .env.local in the frontend/ folder (it's gitignored,
// safe to leave there) containing:
//   NEXT_PUBLIC_API_URL=http://localhost:3000/api
// Next.js loads this automatically on `npm run dev` - no restart needed
// beyond stopping/starting the dev server. Delete the file (or comment the
// line out) to go back to the deployed App Runner API. See
// .env.local.example in this same frontend/ folder for a ready-to-copy
// template.
//
// WHY THE FALLBACK IS HARDCODED HERE AND NOT JUST ALWAYS AN ENV VAR:
// This app builds as a static export (output: 'export' in next.config.ts)
// and gets deployed via Amplify, which doesn't have NEXT_PUBLIC_API_URL set
// anywhere - so in that build, this fallback is what actually ships to
// production. infra/up.ps1 keeps this fallback in sync with the live App
// Runner URL if it ever changes.

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://3hfuwvhp27.us-east-1.awsapprunner.com/api';
