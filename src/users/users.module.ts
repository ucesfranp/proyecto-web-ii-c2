/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller'; //El controller define rutas epsecificas en mi app
import { UsersService } from './users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';


//Un modulo es aquello donde voy importando las diferentes capas que voy a hacer uso. Por ejemplo: la base de datos
//para que funcione la base de datos tengo que importar mongoose. Entonces voy a usar MongooseModule

@Module({

  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],

  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule { }
