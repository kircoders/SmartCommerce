// Phase 1

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { join } from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { Request, Response } from 'express';

interface LoggingConfig {
  dir: string;
  maxSizeKB: number;
  level: string;
}

// Local-dev-only log files - JSON lines, rotated by size (settings come
// from src/config/configuration.ts's `logging` section, via ConfigService -
// see the note in bootstrap() below on why this has to be a function
// called *after* app creation, rather than built at module load time
// the way it was originally).
function buildWinstonLogger(loggingConfig: LoggingConfig) { // takes the settings pulled from configuration.ts
  return winston.createLogger({ // builds the actual Winston object every logger call routes through
    level: loggingConfig.level, // minimum severity to record at all (e.g. 'debug' = keep everything)
    transports: [ // list of destinations - every log line goes to ALL of these, every time
      // Human-readable - what you see live in the terminal. Each entry
      // printed as an indented block instead of one dense line.
      new winston.transports.Console({ // destination #1: your terminal window
        format: winston.format.combine( // chain multiple formatting steps together
          winston.format.timestamp({ format: 'M/D/YYYY, h:mm:ss A' }), // step 1: attach a readable timestamp
          winston.format.printf(({ timestamp, level, message, context, stack }) => { // step 2: build the final text ourselves
            const entry: Record<string, unknown> = { timestamp, level, message }; // always-present fields
            if (context) entry['context'] = context; // only add if this log call actually had one
            if (stack) entry['stack'] = stack; // only add if this is a real error with a trace
            return JSON.stringify(entry, null, 2); // turn the object into pretty-printed JSON text
          }),
        ),
      }),
      // Machine-readable JSON, rotated by size - what actually lands in
      // api/logs/. maxSize triggers a new file once the current one crosses
      // maxSizeKB; datePattern is daily (coarse on purpose - within one dev
      // session it's size, not the clock, that drives rotation).
      //
      // Pretty-printed (multi-line, indented) rather than one compact line
      // per entry - readable by eye when you open the file directly. The
      // tradeoff: entries are no longer one-per-line, so scripts/filter-logs.js
      // reads the whole file and finds each `{...}` block by matching braces,
      // instead of the simpler (and more standard) line-by-line approach.
      new winston.transports.DailyRotateFile({ // destination #2: the actual api/logs/ files
        dirname: join(process.cwd(), loggingConfig.dir), // which folder the files go in
        filename: 'api-%DATE%.log', // %DATE% gets replaced with the real date per datePattern below
        datePattern: 'YYYY-MM-DD', // the date format used in the filename
        maxSize: `${loggingConfig.maxSizeKB}k`, // rotation trigger - e.g. '200k' means 200 kilobytes
        format: winston.format.combine( 
          winston.format.printf(({ timestamp, level, message, context, stack }) => { // step 2: build the final text ourselves
            const entry: Record<string, unknown> = { timestamp: new Date().toUTCString(), level, message }; // always-present fields
            if (context) entry['context'] = context; // only add if this log call actually had one
            if (stack) entry['stack'] = stack; // only add if this is a real error with a trace
            return JSON.stringify(entry, null, 2); // turn the object into pretty-printed JSON text
          }),
        ),
      }),
    ],
  });
}

async function bootstrap() {
  // No custom logger passed here on purpose - NestFactory.create() runs
  // before ConfigService exists (it's what actually builds ConfigService),
  // so there's no way to read configuration.ts's `logging` section yet at
  // this exact point. Nest's own default console logger handles just this
  // one brief startup window instead.
  const app = await NestFactory.create(AppModule, { rawBody: false });

  // Now that the app exists, ConfigService is available - build the real
  // Winston logger from the actual config file and swap it in.
  const config = app.get(ConfigService);
  const loggingConfig = config.get<LoggingConfig>('logging');
  if (!loggingConfig) throw new Error('Missing "logging" section in configuration.ts');
  app.useLogger(WinstonModule.createLogger({ instance: buildWinstonLogger(loggingConfig) }));

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const allowedOrigins = [
    'http://localhost:3000', // Swagger UI itself, served from the API - PUT/POST calls made from /api/docs send this as their Origin
    'http://localhost:3001',
    'https://main.dwdi02ueunudy.amplifyapp.com',
  ];
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.awsapprunner.com')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', container: process.env.HOSTNAME ?? 'unknown' });
  });

  // Interactive API docs at /api/docs. addBearerAuth() adds an "Authorize"
  // button in the UI - paste a JWT there once and it gets attached to
  // every "Try it out" request automatically, same as setting the
  // Authorization header manually in Postman.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SmartCommerce API')
    .setDescription('SmartCommerce backend API - all routes are prefixed with /api')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  const port = config.get<number>('port') ?? 3000;

  await app.listen(port);
}

bootstrap();
