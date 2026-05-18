// src/users/repositories/users.repository.ts
import { Injectable, Inject } from '@nestjs/common';
import { User } from '../schemas/user.schema';
import { CreateUserDto } from '../dto/create-user.dto';
import type { IUsersDao } from '../dao/users.mongoose.dao';

export interface IUsersRepository {
  create(userData: CreateUserDto): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  update(id: string, updateData: Partial<User>): Promise<User | null>;
  delete(id: string): Promise<boolean>;
}

@Injectable()
export class UsersRepository implements IUsersRepository {
  constructor(
    @Inject('IUsersDao') private readonly dao: IUsersDao,
  ) {}

  async create(userData: CreateUserDto): Promise<User> {
    return this.dao.create(userData);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.dao.findByEmail(email);
  }

  async findById(id: string): Promise<User | null> {
    return this.dao.findById(id);
  }

  async findAll(): Promise<User[]> {
    return this.dao.findAll();
  }

  async update(id: string, updateData: Partial<User>): Promise<User | null> {
    return this.dao.update(id, updateData);
  }

  async delete(id: string): Promise<boolean> {
    return this.dao.delete(id);
  }
}