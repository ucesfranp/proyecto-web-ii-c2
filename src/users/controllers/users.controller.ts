/* eslint-disable prettier/prettier */
import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { CreateUserDto } from '../dto/create-user.dto';
import { UsersService } from '../services/users.service';

@Controller('users')
export class UsersController {
  //Creamos un método - Una api una ruta que vamos a usar


  constructor(
    private readonly usersService: UsersService
  ) {}



  @Post()
  async create(@Body() createUserDto: CreateUserDto) { //DTO = Data Transfer Object
    //const user = {
    //  id: Date.now(),
    //  ...createUser,
    //}

    //return user

    /* try{

    
    } catch(err){
      console.log("err: ", err.message);
      return {
        status: 400,
        msg: "Error en la creación del usuario"
        }
        } */
   console.log("createUserDto: ", createUserDto);

   return this.usersService.create(createUserDto);
  }

  @Get()
  async getUsers() {
    /*
    const user = {
      id: "HolaDesdeGet",
      name: "FranciscoDesdeGet",
    }
    */
    const users = this.usersService.findAllUsers();

    return users
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateData: any) {
    return this.usersService.update(id, updateData);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }

}
