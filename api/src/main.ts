import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
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

  app.enableCors({
    origin: [
      'http://localhost:3001',
      'https://main.dwdi02ueunudy.amplifyapp.com',
      'https://d1k5e466mkmb2q.cloudfront.net',
    ],
    credentials: true,
  });

  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', container: process.env.HOSTNAME ?? 'unknown' });
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('port') ?? 3000;

  await app.listen(port);
}

bootstrap();
