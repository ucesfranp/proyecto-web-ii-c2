/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose/dist/mongoose.module';

@Module({
  imports: [UsersModule,

    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    })

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

//Unidad base principal de NestJS
/*Pq es importante la organización? 
  La organización y estructura de un proyecto determina si el sistema escala y puede crecer o se colapsa y derrumba pasados los años
*/
//Un Modulo es la unidad organizatiba central y todo gira en como agrupamos respondabilidades dentro de estos modulos
//Cada modulo va a tener una responsabilidad
// es clave para la escalabilidad poder agregar modulos, nos da mantenabilidad pq nos permite entender más rpaido el codigo y permite testear de forma separada cada  funcionalidad, si los voy agrpando en modulos me permite entender donde esta el error ya que lo tengo separado en modulos pequeños. Entonces a la hora de manejarlo es muy importante dividir todo en pequeños modulos. Acomplamiento --> Evista que estas funcionalidades este mezcladas, interconectadas, par el debugueo si ahy un error es mucho más facil
// Un modulo agrupa cierta logica de negocio --> En el modulo agrupo logica de negocio (Diferentes tipos de funcionalidades, como Ej: relacionada al usuario, al pago, a las ordenes o pedidos que pueda hacer el usuario, a cada una la agrupo en modulos diferentes) cada logica de negocio

// Nest agrupa diferentes comandos CLI
// --> En el cli hacemos: nest generate module users
