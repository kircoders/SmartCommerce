// Phase 1

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'],
    rawBody: false,
  });
  app.useLogger({
    log: (msg: string) => process.stdout.write(msg.replace(/\x1B\[[0-9;]*m/g, '') + '\n'),
    error: (msg: string) => process.stderr.write(msg.replace(/\x1B\[[0-9;]*m/g, '') + '\n'),
    warn: (msg: string) => process.stdout.write(msg.replace(/\x1B\[[0-9;]*m/g, '') + '\n'),
    debug: () => {},
    verbose: () => {},
    fatal: (msg: string) => process.stderr.write(msg.replace(/\x1B\[[0-9;]*m/g, '') + '\n'),
  });

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

  const config = app.get(ConfigService);
  const port = config.get<number>('port') ?? 3000;

  await app.listen(port);
}

bootstrap();
