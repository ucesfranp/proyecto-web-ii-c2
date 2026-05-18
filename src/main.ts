/* eslint-disable prettier/prettier */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  //Indicamos que para cualquier peticion corra las validaciones que le pedimos
  app.useGlobalPipes(
    new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    }),
  ); 

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on port: ${process.env.PORT ?? 3000}`);
}
bootstrap();
