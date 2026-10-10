// Runs `next dev` as a child process and mirrors its output through
// Winston, the same way the NestJS backend logs (see api/src/main.ts) -
// JSON, rotated by size, multiple levels, pretty-printed on disk.
//
// Next.js has no logger hook to plug into like NestJS's app.useLogger() -
// its dev server just prints plain text to stdout/stderr. So instead of
// wiring into the framework, this script IS the framework wrapper: it
// spawns `next dev` itself, reads its output line by line, and feeds each
// line into the same kind of Winston setup used on the backend.
//
// Level is guessed from the line's content, since Next.js's own output
// doesn't carry a level the way NestJS's Logger calls do:
//   - lines with "⨯" or "Error" -> error
//   - lines with "⚠" or "Warning" -> warn
//   - everything else -> info

const { spawn } = require('child_process');
const path = require('path');
const winston = require('winston');
require('winston-daily-rotate-file');
const config = require('../logging.config');

const winstonLogger = winston.createLogger({
  level: config.level,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'M/D/YYYY, h:mm:ss A' }),
        winston.format.printf(({ timestamp, level, message }) => {
          return JSON.stringify({ timestamp, level, message }, null, 2);
        }),
      ),
    }),
    new winston.transports.DailyRotateFile({
      dirname: path.join(__dirname, '..', config.dir),
      filename: 'frontend-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: `${config.maxSizeKB}k`,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'M/D/YYYY, h:mm:ss A' }),
        winston.format.printf(({ timestamp, level, message }) => {
          return JSON.stringify({ timestamp, level, message }, null, 2);
        }),
      ),
    }),
  ],
});

function stripAnsi(str) {
  return str.replace(/\x1B\[[0-9;]*m/g, '');
}

function guessLevel(line) {
  if (line.includes('⨯') || /\bError\b/.test(line)) return 'error';
  if (line.includes('⚠') || /\bWarning\b/.test(line)) return 'warn';
  return 'info';
}

function logLine(rawLine) {
  const line = stripAnsi(rawLine).trimEnd();
  if (!line) return;
  winstonLogger.log(guessLevel(line), line);
}

// -p 3001 is hardcoded, not left to chance: without it, Next.js grabs
// whatever port is free, defaulting to 3000 - the same port the backend
// normally uses. If the backend isn't running yet, Next.js happily takes
// 3000 for itself, and NEXT_PUBLIC_API_URL (which also points at 3000)
// ends up pointing the frontend at itself instead of the real backend.
const child = spawn('npx', ['next', 'dev', '-p', '3001'], {
  cwd: path.join(__dirname, '..'),
  shell: true,
});

child.stdout.on('data', (data) => {
  data.toString().split('\n').forEach(logLine);
});

child.stderr.on('data', (data) => {
  data.toString().split('\n').forEach(logLine);
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

process.on('SIGINT', () => {
  child.kill('SIGINT');
});
