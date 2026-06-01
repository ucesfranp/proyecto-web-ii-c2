// src/users/dao/users.mongoose.dao.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../schemas/user.schema';
import { CreateUserDto } from '../dto/create-user.dto';


export interface IUsersDao {
  create(userData: CreateUserDto): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  update(id: string, updateData: Partial<User>): Promise<User | null>;
  delete(id: string): Promise<boolean>;
}

@Injectable()
export class UsersMongooseDao implements IUsersDao {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async create(userData: CreateUserDto): Promise<User> {
    //Este creadoUsuario no es el que va a llegar finalmente a la base de datos, sino una instancia de la clase User de Mongoose
    console.log("userData: ", userData);

    const createdUser = new this.userModel(userData);
    console.log("createdUser: ", createdUser);




    const createdUserFromDB = await createdUser.save();
    console.log("createdUserFromDB: ", createdUserFromDB);

    return createdUserFromDB;
   
  }




  async findByEmail(email: string): Promise<User | null> {
    console.log("Mail a buscar si existe: ", email);
    return this.userModel.findOne({ mail: email }).exec();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async update(id: string, updateData: Partial<User>): Promise<User | null> {
    return this.userModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    return result !== null;
  }
}