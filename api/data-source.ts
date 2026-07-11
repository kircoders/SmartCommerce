// Phase 1

import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as path from 'path';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env['DB_HOST'],
  port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
  database: process.env['DB_NAME'],
  username: process.env['DB_USERNAME'],
  password: process.env['DB_PASSWORD'],
  ssl: { rejectUnauthorized: false },
  entities: [path.join(__dirname, 'src/**/*.entity.{ts,js}')],
  migrations: [path.join(__dirname, 'src/migrations/*.{ts,js}')],
});
