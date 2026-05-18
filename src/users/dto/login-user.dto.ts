// src/users/dto/login-user.dto.ts
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginUserDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  mail: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}