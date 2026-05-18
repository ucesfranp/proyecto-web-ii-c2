// src/users/dto/user-response.dto.ts
import { Exclude } from 'class-transformer';

export class UserResponseDto {
  id: string;
  name: string;
  surname: string;
  mail: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  @Exclude()
  password: string;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}