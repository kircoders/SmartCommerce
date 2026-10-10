// Same tool as api/scripts/filter-logs.js, adapted for the frontend's log
// files (see scripts/dev-logger.js). Usage (from frontend/):
//   node scripts/filter-logs.js
//   node scripts/filter-logs.js --level=error
//   node scripts/filter-logs.js --after=2026-07-21T22:00:00
//   node scripts/filter-logs.js --before=2026-07-21T22:30:00

const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '..', 'logs');

function getArg(name) {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split('=').slice(1).join('=') : null;
}

const levelFilter = getArg('level');
const afterArg = getArg('after');
const beforeArg = getArg('before');
const afterFilter = afterArg ? new Date(afterArg) : null;
const beforeFilter = beforeArg ? new Date(beforeArg) : null;

if (!fs.existsSync(logsDir)) {
  console.log('No logs directory found - has the frontend been run yet?');
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
