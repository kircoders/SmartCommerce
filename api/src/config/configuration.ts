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
});
