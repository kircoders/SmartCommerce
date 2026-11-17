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
  // Phase 11 - Amazon Bedrock. No keys here: the AWS SDK finds credentials
  // itself (your AWS CLI login locally, the App Runner IAM role in AWS).
  // The model ID is a "us." inference profile - the plain model IDs are
  // refused for this account.
  ai: {
    region: process.env['AWS_REGION'] ?? 'us-east-1',
    modelId:
      process.env['BEDROCK_MODEL_ID'] ?? 'us.anthropic.claude-sonnet-4-6',
  },
  logging: {
    // Local dev log files - JSON lines, rotated by size. Not used for
    // anything in production (App Runner logs go to CloudWatch instead).
    dir: process.env['LOG_DIR'] ?? 'logs',
    maxSizeKB: parseInt(process.env['LOG_MAX_SIZE_KB'] ?? '200', 10),
    level: process.env['LOG_LEVEL'] ?? 'debug',
  },
});
