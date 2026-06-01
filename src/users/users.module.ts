/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { UsersController } from './controllers/users.controller'; //El controller define rutas epsecificas en mi app
import { UsersService } from './services/users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UsersRepository } from './repository/users.repository';
import { UsersMongooseDao } from './dao/users.mongoose.dao';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';


//Un modulo es aquello donde voy importando las diferentes capas que voy a hacer uso. Por ejemplo: la base de datos
//para que funcione la base de datos tengo que importar mongoose. Entonces voy a usar MongooseModule

@Module({

  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),

    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRATION') || '1h',
        },
      }),
      inject: [ConfigService],
    })
  ],

  controllers: [UsersController, AuthController],
  providers: [
    UsersService, AuthService,
    {
      provide: 'IUsersRepository',
      useClass: UsersRepository,
    },
    {
      provide: 'IUsersDao',
      useClass: UsersMongooseDao,
    },
  ],
})
export class UsersModule { }
