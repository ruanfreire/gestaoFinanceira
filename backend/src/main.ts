import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { json } from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.use(json({ limit: '5mb' }));
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT || 4000);
  console.log(`Backend listening on ${process.env.PORT || 4000}`);
}

bootstrap().catch((err) => {
  console.error('Error starting server', err);
  process.exit(1);
});

