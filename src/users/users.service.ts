/* eslint-disable no-empty */
/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create_user_dto';
import { InjectModel } from '@nestjs/mongoose/dist/common/mongoose.decorators';
import { User } from './dto/schemas/user.schema';
import { Model } from 'mongoose';

@Injectable()
export class UsersService {
    /* Dejamos este metodo de lado que fue hardcodeado
    create(createUserDto: CreateUserDto){
        const user = {
            id: Date.now(),
            ...createUserDto
        }

        //const user = this.capaEncargadaDeObtencionDeUserDeBD()

        return user;

    }
    */

    constructor(
        @InjectModel(User.name) private userModel: Model<User>,
    ){}

    validateMailUniqueness(mail :string): boolean{
        //buscar en BD si ya existe el mail
        return true; 
    }

    async create(createUserDto: CreateUserDto){
        
        this.validateMailUniqueness(createUserDto.mail)

        try{
            const createdUser = new this.userModel(createUserDto);
            console.log(createdUser);
            return createdUser.save();
            
        } catch (error){
            console.log(error)
        }

    }
    
    async findAll(){
        return this.userModel.find().exec();
    }
    


}
