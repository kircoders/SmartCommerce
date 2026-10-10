// Reads every log file in api/logs/, optionally filters by level, context,
// and/or a date/time range, and prints the matching entries in
// chronological order.
//
// Usage (from api/):
//   node scripts/filter-logs.js                             -> everything
//   node scripts/filter-logs.js --level=error                -> only errors
//   node scripts/filter-logs.js --context=ExceptionFilter     -> only that context
//   node scripts/filter-logs.js --after=2026-07-21T22:00:00   -> after this time
//   node scripts/filter-logs.js --before=2026-07-21T22:30:00  -> before this time
// Combine freely, e.g.:
//   node scripts/filter-logs.js --level=warn --after=2026-07-21T22:00:00
//
// --after/--before accept anything JavaScript's `new Date(...)` understands
// - a full ISO timestamp (as above), or just a date like 2026-07-21.
//
// Each log entry is pretty-printed, multi-line JSON (not one-per-line -
// see api/src/main.ts's DailyRotateFile transport), so entries can't just
// be split on '\n'. Instead, extractJsonObjects scans the raw file text
// character by character, tracking { }  nesting depth (and skipping over
// braces that appear inside quoted strings, e.g. in a message), and treats
// each complete top-level {...} block as one entry.

const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '..', 'logs');

function getArg(name) {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split('=').slice(1).join('=') : null;
}

const levelFilter = getArg('level');
const contextFilter = getArg('context');
const afterArg = getArg('after');
const beforeArg = getArg('before');
const afterFilter = afterArg ? new Date(afterArg) : null;
const beforeFilter = beforeArg ? new Date(beforeArg) : null;

if (!fs.existsSync(logsDir)) {
  console.log('No logs directory found - has the backend been run yet?');
  process.exit(0);
}

function extractJsonObjects(text) {
  const objects = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        try {
          objects.push(JSON.parse(text.slice(start, i + 1)));
        } catch {
          // skip malformed/partial blocks rather than crash the whole tool
        }
        start = -1;
      }
    }
  }
  return objects;
}

const files = fs.readdirSync(logsDir).filter((f) => f.endsWith('.log') || /\.log\.\d+$/.test(f));

const entries = [];
for (const file of files) {
  const content = fs.readFileSync(path.join(logsDir, file), 'utf8');
  entries.push(...extractJsonObjects(content));
}

entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

const filtered = entries.filter((e) => {
  if (levelFilter && e.level !== levelFilter) return false;
  if (contextFilter && e.context !== contextFilter) return false;
  if (afterFilter && new Date(e.timestamp) < afterFilter) return false;
  if (beforeFilter && new Date(e.timestamp) > beforeFilter) return false;
  return true;
});

if (filtered.length === 0) {
  console.log('No matching entries found.');
} else {
  for (const entry of filtered) {
    console.log(JSON.stringify(entry, null, 2));
  }
  console.log(`\n${filtered.length} entr${filtered.length === 1 ? 'y' : 'ies'} shown.`);
}
