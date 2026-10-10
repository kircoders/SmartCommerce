// Phase 1

export default () => ({
  port: parseInt(process.env['PORT'] ?? '3000', 10),
  database: {
    host: process.env['DB_HOST'],
    port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
    name: process.env['DB_NAME'],
    username: process.env['DB_USERNAME'],
    password: process.env['DB_PASSWORD'],
  },
  jwt: {
    secret: process.env['JWT_SECRET'],
    expiresIn: process.env['JWT_EXPIRES_IN'] ?? '1h',
  },
  logging: {
    // Local dev log files - JSON lines, rotated by size. Not used for
    // anything in production (App Runner logs go to CloudWatch instead).
    dir: process.env['LOG_DIR'] ?? 'logs',
    maxSizeKB: parseInt(process.env['LOG_MAX_SIZE_KB'] ?? '200', 10),
    level: process.env['LOG_LEVEL'] ?? 'debug',
  },
});
