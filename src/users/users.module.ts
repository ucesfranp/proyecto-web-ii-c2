/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller'; //El controller define rutas epsecificas en mi app
import { UsersService } from './users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './dto/schemas/user.schema';

@Module({

  imports: [
      MongooseModule.forFeature([{ name: User.name, schema: UserSchema}]),
  ],

  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
