# Arquitectura en capas: Auth, DAO, Repository y SOLID en NestJS

## Objetivo de la clase

Partimos de una app NestJS basica que ya tiene:
- Un modulo `users` con un controller, un service y un schema de Mongoose
- Endpoints `POST /users/create` y `GET /users`
- El service usa el modelo de Mongoose **directamente**

Vamos a evolucionar esta app paso a paso hasta llegar a una arquitectura profesional con:
- Autenticacion con JWT y bcrypt
- Capa DAO especifica para Mongoose
- Capa Repository como abstraccion de persistencia
- Principios SOLID aplicados en cada decision

---

## Slide 1 — Estado actual del proyecto (punto de partida)

Asi esta nuestra app ahora mismo:

```
src/
├── app.module.ts
├── main.ts
└── users/
    ├── users.module.ts
    ├── users.controller.ts
    ├── users.service.ts
    └── dto/
        ├── create_user.dto.ts
        └── schemas/
            └── user.schema.ts
```

### El schema actual

```typescript
// src/users/dto/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  surname: string;

  @Prop({ required: true, unique: true })
  mail: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
```

### El service actual

```typescript
// src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create_user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './dto/schemas/user.schema';
import { Model } from 'mongoose';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    try {
      const createdUser = new this.userModel(createUserDto);
      return createdUser.save();
    } catch (error) {
      console.log(error);
    }
  }

  async findAllUsers() {
    return this.userModel.find().exec();
  }
}
```

### El controller actual

```typescript
// src/users/users.controller.ts
import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateUserDto } from './dto/create_user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('/create')
  create(@Body() createUser: CreateUserDto) {
    return this.usersService.create(createUser);
  }

  @Get()
  getUsers() {
    return this.usersService.findAllUsers();
  }
}
```

### Problemas de esta arquitectura

1. **El Service habla directo con Mongoose** - Si cambio de base de datos, tengo que reescribir el service
2. **No hay manejo de errores apropiado** - Solo un console.log
3. **No hay autenticacion** - Cualquiera puede crear y listar usuarios
4. **No hay password** - No podemos hacer login
5. **El service tiene multiples responsabilidades** - Logica de negocio + acceso a datos mezclados
