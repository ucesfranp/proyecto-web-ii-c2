/* eslint-disable prettier/prettier */
import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateUserDto } from './dto/create_user_dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  //Creamos un método - Una api una ruta que vamos a usar


    constructor(
        private readonly usersService:UsersService
    ){}



  @Post('/create')
  create(@Body() createUser: CreateUserDto) { //DTO = Data Transfer Object
    //const user = {
    //  id: Date.now(),
    //  ...createUser,
    //}

    //return user

    return this.usersService.create(createUser);
  }

  @Get()
    getUsers() {
      const user = {
        id: "HolaDesdeGet",
        name: "FranciscoDesdeGet",
      }

      return user
    }
}
