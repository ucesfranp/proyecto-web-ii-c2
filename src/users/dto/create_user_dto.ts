/* eslint-disable prettier/prettier */
//TS = TypeScript

import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";



export class CreateUserDto{
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    name: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    surname: string;

    @IsString()
    @IsNotEmpty()
    @IsEmail()
    mail: string;
}