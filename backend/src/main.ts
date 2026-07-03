import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { json } from 'body-parser';

let app: INestApplication | undefined;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function listenWithRetry(nestApp: INestApplication, port: number, attempts = 8) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await nestApp.listen(port);
      return;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'EADDRINUSE' || attempt === attempts) {
        throw error;
      }
      console.warn(`Porta ${port} em uso; aguardando liberação (${attempt}/${attempts})...`);
      await sleep(400 * attempt);
    }
  }
}

async function shutdown(signal: string) {
  if (!app) {
    process.exit(0);
    return;
  }

  console.log(`Encerrando backend (${signal})...`);
  try {
    await app.close();
  } catch (error) {
    console.error('Erro ao encerrar backend', error);
  }
  process.exit(0);
}

async function bootstrap() {
  app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableShutdownHooks();
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cookieParser());
  app.use(json({ limit: '5mb' }));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  if (process.env.SWAGGER_ENABLED === 'true') {
    const config = new DocumentBuilder()
      .setTitle('Gestão Financeira API')
      .setDescription('Contratos REST — somente leitura de referência')
      .setVersion('0.2.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = Number(process.env.PORT || 4000);
  await listenWithRetry(app, port);
  console.log(`Backend listening on ${port}`);
}

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));

bootstrap().catch((err) => {
  console.error('Error starting server', err);
  process.exit(1);
});
