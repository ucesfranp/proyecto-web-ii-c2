/* eslint-disable no-empty */
/* eslint-disable prettier/prettier */

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectModel } from '@nestjs/mongoose/dist/common/mongoose.decorators';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';
import { plainToClass } from 'class-transformer';
import { UserResponseDto } from './dto/user-response.dto';
import { IUsersRepository } from './repository/users.repository';

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
    /*
    constructor(
        @InjectModel(User.name) private userModel: Model<User>, //Inyectar es como importar
    ) { }

    validateMailUniqueness(mail: string): boolean {
        //buscar en BD si ya existe el mail
        return true;
    }

    async create(createUserDto: CreateUserDto) {

        this.validateMailUniqueness(createUserDto.mail)

        try {
            const createdUser = new this.userModel(createUserDto);
            console.log(createdUser);
            return createdUser.save();

        } catch (error) {
            console.log(error)
        }

    }

    async findAllUsers() {
        return this.userModel.find().exec();
    }
    */
   async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const existingUser = await this.usersRepository.findByEmail(createUserDto.mail);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const user = await this.usersRepository.create(createUserDto);
        return plainToClass(UserResponseDto, user.toObject());
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.usersRepository.findByEmail(email);
    }

    async findById(id: string): Promise<UserResponseDto> {
        const user = await this.usersRepository.findById(id);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return plainToClass(UserResponseDto, user.toObject());
    }

    async findAllUsers(): Promise<UserResponseDto[]> {
        const users = await this.usersRepository.findAll();
        return users.map((user) => plainToClass(UserResponseDto, user.toObject()));
    }

    async update(id: string, updateData: Partial<User>): Promise<UserResponseDto> {
        const user = await this.usersRepository.update(id, updateData);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return plainToClass(UserResponseDto, user.toObject());
    }

    async delete(id: string): Promise<boolean> {
        return this.usersRepository.delete(id);
    }
    
    constructor(
        @Inject('IUsersRepository') private readonly usersRepository: IUsersRepository,
    ) {}

}
