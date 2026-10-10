// Local dev log settings for the frontend - mirrors api/src/config/configuration.ts's
// `logging` section. Next.js has no built-in logger hook to plug into the way
// NestJS does, so this is read directly by scripts/dev-logger.js instead of
// through a framework config system.
module.exports = {
  dir: process.env.LOG_DIR || 'logs', // which folder does it get written into 
  maxSizeKB: parseInt(process.env.LOG_MAX_SIZE_KB || '200', 10), // file size of each log
  level: process.env.LOG_LEVEL || 'debug', // minimum severity worth writing down at all (debug < info < warn < error)
};
