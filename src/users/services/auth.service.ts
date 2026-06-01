// src/users/services/auth.service.ts
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { LoginUserDto } from '../dto/login-user.dto';
import { User } from '../schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /* Se encarga de validar el usuario */
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    console.log("User: ", user);
    console.log("Password: ", password);

    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    return null;
  }

  async login(loginUserDto: LoginUserDto) {
    const user = await this.validateUser(loginUserDto.mail, loginUserDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user._id.toString(),
      email: user.mail,
      role: user.role,
    };

    console.log("Objeto en base al cual creo el JWT: ", payload)

    return {
      access_token: this.jwtService.sign(payload),//Para generar un token en base al objeto payload y se lo asigno al access token que utilizamos en las peticiones mientras navegamos en la web
      user: {
        id: user._id.toString(),
        name: user.name,
        surname: user.surname,
        email: user.mail,
        role: user.role,
      },
    };
  }


  /* Metodo para registrar un nuevo usuario */
  async register(createUserDto: CreateUserDto) {
    const existingUser = await this.usersService.findByEmail(createUserDto.mail);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    //Esto es lo nuevo agregado
    //Req tecnico: NO GUARDAR CLAVES DE USUARIO DE FORMA PLANA, ENCRIPTAR
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10); //Es un valor seguro el 10
    const userData = {
      ...createUserDto, //Los 3 puntos significa que copie los propiedades del objeto createUserDto
      password: hashedPassword, //y reemplazo la propiedad password por la contraseña encriptada
    };
    console.log("userData: ", userData);

    return this.usersService.create(userData);
  }

  async getProfile(userId: string) {
    return this.usersService.findById(userId);
  }
}
