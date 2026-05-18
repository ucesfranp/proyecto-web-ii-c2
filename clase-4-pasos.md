# Arquitectura en capas: Auth, DAO, Repository y SOLID en NestJS

## Objetivo de la clase

Partimos de una app NestJS básica que ya tiene:
- Un módulo `users` con un controller, un service y un schema de Mongoose
- Endpoints `POST /users/create` y `GET /users`
- El service usa el modelo de Mongoose **directamente**

Vamos a evolucionar esta app paso a paso hasta llegar a una arquitectura profesional con:
- Autenticación con JWT y bcrypt
- Capa DAO específica para Mongoose
- Capa Repository como abstracción de persistencia
- Principios SOLID aplicados en cada decisión

---

## Slide 1 — Estado actual del proyecto (punto de partida)

Así está nuestra app ahora mismo:

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
2. **No hay manejo de errores apropiado** - Solo un `console.log`
3. **No hay autenticacion** - Cualquiera puede crear y listar usuarios
4. **No hay password** - No podemos hacer login
5. **El service tiene multiples responsabilidades** - Logica de negocio + acceso a datos mezclados


---

## Slide 2 — A donde queremos llegar

```
src/users/
├── controllers/
│   ├── users.controller.ts      # CRUD de usuarios
│   └── auth.controller.ts       # Login, Register, Profile
├── services/
│   ├── users.service.ts         # Logica de negocio de usuarios
│   └── auth.service.ts          # Logica de autenticacion
├── repositories/
│   └── users.repository.ts      # Abstraccion de persistencia
├── dao/
│   └── users.mongoose.dao.ts    # Acceso directo a Mongoose
├── dto/
│   ├── create-user.dto.ts
│   ├── login-user.dto.ts
│   └── user-response.dto.ts
├── schemas/
│   └── user.schema.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   └── local-auth.guard.ts
├── strategies/
│   ├── jwt.strategy.ts
│   └── local.strategy.ts
└── users.module.ts
```

### Flujo de capas

```
HTTP Request
    |
Controller        <- Recibe request, valida DTO, delega
    |
Service           <- Logica de negocio (hash, JWT, validaciones)
    |
Repository        <- Abstraccion de persistencia (interfaz)
    |
DAO               <- Implementacion concreta (Mongoose)
    |
MongoDB
```

### Por que todo en un solo modulo?

Auth y Users son parte del **mismo dominio**: la gestion de identidad. Si modifico el schema de User, probablemente tambien deba modificar el registro y el login. Mantenerlos juntos reduce la friccion y evita dependencias circulares entre modulos.


---

## Slide 3 — Instalar dependencias nuevas

Nuestro `package.json` actual ya tiene `@nestjs/mongoose`, `mongoose`, `class-validator` y `class-transformer`. Necesitamos agregar:

```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt passport-local
npm install bcrypt
npm install -D @types/passport-jwt @types/passport-local @types/bcrypt
```

### Para que sirve cada una?

| Paquete | Uso |
|---------|-----|
| `@nestjs/jwt` | Generar y verificar tokens JWT dentro del ecosistema NestJS |
| `@nestjs/passport` + `passport` | Framework de autenticacion basado en strategies |
| `passport-jwt` | Strategy para validar tokens JWT en el header Authorization |
| `passport-local` | Strategy para validar email/password en el body |
| `bcrypt` | Hash seguro de passwords con salt |
| `@types/*` | Tipos de TypeScript para las librerias |

### Por que bcrypt y no un hash simple como SHA-256?

`bcrypt` agrega un **salt** aleatorio a cada hash, lo que significa que dos usuarios con el mismo password tendran hashes diferentes. Ademas, es intencionalmente lento (configurable con salt rounds), lo que dificulta ataques de fuerza bruta.


---

## Slide 4 — Paso 1: Evolucionar el Schema

Nuestro schema actual no tiene `password` ni `role`. Necesitamos agregarlos para soportar autenticacion.

### Antes (estado actual)

```typescript
@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  surname: string;

  @Prop({ required: true, unique: true })
  mail: string;
}
```

### Despues

```typescript
// src/users/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  surname: string;

  @Prop({ required: true, unique: true })
  mail: string;

  @Prop({ required: true })
  password: string;

  @Prop({
    type: String,
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Prop({ default: true })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
```

### Que cambio y por que?

| Cambio | Motivo |
|--------|--------|
| `extends Document` | Hereda metodos de Mongoose (`.toObject()`, `.save()`, `_id`) necesarios para trabajar con el documento |
| `password: string` | Necesario para autenticacion. Se guardara hasheado con bcrypt |
| `enum UserRole` | Permite diferenciar permisos. El enum restringe valores posibles |
| `isActive: boolean` | Permite "soft delete" sin borrar el documento de la DB |

### Tambien movemos el schema de ubicacion

De `src/users/dto/schemas/user.schema.ts` a `src/users/schemas/user.schema.ts`

**Por que?** El schema es una definicion de **infraestructura** (como se persiste el dato en MongoDB). No es un DTO (como entra/sale del API). Mezclarlos en la misma carpeta confunde responsabilidades.


---

## Slide 5 — Paso 2: Crear los DTOs

Los DTOs (Data Transfer Objects) definen **que datos acepta y devuelve nuestra API**. Son la frontera entre el mundo exterior y nuestra logica interna.

### CreateUserDto — Validar datos de entrada para crear usuario

```typescript
// src/users/dto/create-user.dto.ts
import { IsEmail, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class CreateUserDto {
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

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
  })
  password: string;
}
```

**Diferencia con el DTO anterior:** Antes solo teniamos `name`, `surname` y `mail`. Ahora agregamos `password` con validacion de complejidad usando `@Matches` con regex.

**Por que `@Matches` con regex?** Forzamos passwords seguros desde la validacion. Si el body no cumple, NestJS devuelve un 400 automaticamente gracias al `ValidationPipe` que ya tenemos configurado en `main.ts`.

### LoginUserDto — Solo lo necesario para autenticarse

```typescript
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
```

### UserResponseDto — Lo que devolvemos al cliente (sin password)

```typescript
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
```

### Por que `@Exclude()`?

**Principio de seguridad:** NUNCA devolver el hash del password al cliente. `class-transformer` con `@Exclude()` elimina el campo automaticamente al serializar la respuesta.

### Principio SOLID: Single Responsibility (S)

Cada DTO tiene UNA responsabilidad:
- `CreateUserDto` - validar entrada para creacion
- `LoginUserDto` - validar entrada para login
- `UserResponseDto` - formatear salida segura


---

## Slide 6 — Paso 3: Crear la capa DAO

### Que problema resolvemos?

En nuestro codigo actual, el `UsersService` usa `@InjectModel(User.name)` directamente:

```typescript
// Estado actual: el service habla directo con Mongoose
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  }
}
```

**Problema:** Si manana queremos cambiar Mongoose por TypeORM o Prisma, tenemos que reescribir TODO el service. La logica de negocio esta acoplada a la tecnologia de persistencia.

### Solucion: extraer el acceso a datos a su propia capa

```typescript
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
    const createdUser = new this.userModel(userData);
    return createdUser.save();
  }

  async findByEmail(email: string): Promise<User | null> {
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
```

### Que hace cada parte?

- **`interface IUsersDao`** - Define el **contrato**. Cualquier implementacion (Mongoose, TypeORM, Prisma) debe cumplirlo.
- **`@InjectModel(User.name)`** - NestJS inyecta el modelo de Mongoose registrado en el modulo.
- **`.exec()`** - Ejecuta la query y devuelve una Promise real (buena practica con Mongoose).
- **`{ new: true }`** en `findByIdAndUpdate` - Devuelve el documento DESPUES de la actualizacion, no el anterior.

### Por que el nombre `UsersMongooseDao`?

Porque manana podriamos tener:
- `UsersPostgresDao` - para PostgreSQL
- `UsersInMemoryDao` - para tests unitarios

El nombre deja claro que tecnologia usa esta implementacion especifica.

### Principio SOLID: Interface Segregation (I)

La interfaz `IUsersDao` define SOLO los metodos que necesitamos. No exponemos todo lo que Mongoose puede hacer (aggregations, populate, etc.), solo lo que nuestra app requiere.

### Principio SOLID: Dependency Inversion (D)

Definimos una interfaz (`IUsersDao`) y una implementacion (`UsersMongooseDao`). El codigo que use esta capa dependera de la interfaz, no de la clase concreta.


---

## Slide 7 — Paso 4: Crear la capa Repository

### Por que Repository si ya tenemos DAO?

| Capa | Responsabilidad | Sabe de Mongoose? |
|------|----------------|-------------------|
| **DAO** | Ejecutar queries contra la DB | Si |
| **Repository** | Orquestar acceso a datos, agregar cache, logging, mapeos | No |

El Repository es una **capa de abstraccion sobre el DAO**. Ahora mismo puede parecer redundante, pero existe para crecer sin romper nada.

```typescript
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
```

### "Pero esto es solo un pass-through? Para que sirve?"

Ahora si, es un pass-through. Pero esta capa existe para **crecer sin romper nada**. Ejemplos de lo que podriamos agregar en el futuro:

```typescript
// Ejemplo futuro: agregar cache Redis
async findById(id: string): Promise<User | null> {
  const cached = await this.cache.get(`user:${id}`);
  if (cached) return cached;

  const user = await this.dao.findById(id);
  if (user) await this.cache.set(`user:${id}`, user, 300);
  return user;
}
```

```typescript
// Ejemplo futuro: agregar logging/auditoria
async delete(id: string): Promise<boolean> {
  this.logger.warn(`Deleting user ${id}`);
  return this.dao.delete(id);
}
```

### Principio SOLID: Open/Closed (O)

El Repository esta **abierto a extension** (puedo agregar cache, logging, auditoria) pero **cerrado a modificacion** (no necesito tocar el DAO ni el Service para hacerlo).

### Principio SOLID: Dependency Inversion (D)

```typescript
@Inject('IUsersDao') private readonly dao: IUsersDao
```

El Repository depende de la **interfaz** `IUsersDao`, no de la clase `UsersMongooseDao`. La implementacion concreta se resuelve en el modulo.


---

## Slide 8 — Paso 5: Reescribir el UsersService

### Antes (estado actual) - Service acoplado a Mongoose

```typescript
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

### Despues - Service que solo conoce la interfaz del Repository

```typescript
// src/users/services/users.service.ts
import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { CreateUserDto } from '../dto/create-user.dto';
import { User } from '../schemas/user.schema';
import type { IUsersRepository } from '../repositories/users.repository';
import { UserResponseDto } from '../dto/user-response.dto';
import { plainToClass } from 'class-transformer';

@Injectable()
export class UsersService {
  constructor(
    @Inject('IUsersRepository') private readonly usersRepository: IUsersRepository,
  ) {}

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
}
```

### Que cambio?

| Antes | Despues |
|-------|---------|
| `@InjectModel(User.name) private userModel` | `@Inject('IUsersRepository') private usersRepository` |
| `try/catch` con `console.log` | Excepciones HTTP apropiadas (`ConflictException`, `NotFoundException`) |
| Devuelve el documento crudo | Devuelve `UserResponseDto` (sin password) |
| No valida unicidad de email | Verifica si el email ya existe antes de crear |

### Que hace el Service ahora?

1. **Validaciones de negocio**: El email ya existe? -> `ConflictException` (409)
2. **Transformacion de respuesta**: Convierte el documento Mongoose a `UserResponseDto` (sin password)
3. **Manejo de errores**: No se encontro el usuario? -> `NotFoundException` (404)

### Por que `plainToClass`?

`user.toObject()` devuelve un objeto plano de JavaScript. `plainToClass(UserResponseDto, ...)` lo convierte en una instancia de `UserResponseDto`, activando el `@Exclude()` del password.

### Principio SOLID: Single Responsibility (S)

El Service NO:
- Hashea passwords (eso lo hace AuthService)
- Ejecuta queries de Mongoose (eso lo hace el DAO)
- Valida el formato del email (eso lo hace el DTO con class-validator)

El Service SI:
- Aplica reglas de negocio (unicidad de email)
- Transforma datos para la respuesta
- Lanza excepciones HTTP apropiadas


---

## Slide 9 — Paso 6: Crear el AuthService

El AuthService maneja todo lo relacionado con **autenticacion**: hashing, JWT, validacion de credenciales.

```typescript
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

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
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

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id.toString(),
        name: user.name,
        surname: user.surname,
        email: user.mail,
        role: user.role,
      },
    };
  }

  async register(createUserDto: CreateUserDto) {
    const existingUser = await this.usersService.findByEmail(createUserDto.mail);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const userData = {
      ...createUserDto,
      password: hashedPassword,
    };

    return this.usersService.create(userData);
  }

  async getProfile(userId: string) {
    return this.usersService.findById(userId);
  }
}
```

### Que hace cada metodo?

| Metodo | Responsabilidad |
|--------|----------------|
| `validateUser` | Busca usuario por email y compara password con bcrypt |
| `login` | Valida credenciales y genera JWT |
| `register` | Hashea password y delega la creacion al UsersService |
| `getProfile` | Obtiene datos del usuario autenticado |

### Por que `bcrypt.hash(password, 10)`?

El `10` es el numero de **salt rounds**. Mas rounds = mas seguro pero mas lento. 10 es el estandar recomendado para produccion.

### Por que el payload del JWT tiene `sub`?

```typescript
const payload = { sub: user._id.toString(), email: user.mail, role: user.role };
```

`sub` (subject) es una convencion del estandar JWT (RFC 7519). Identifica al "sujeto" del token. Usamos el `_id` de MongoDB.

### Separacion de responsabilidades: AuthService vs UsersService

- **AuthService**: sabe de passwords, tokens, autenticacion
- **UsersService**: sabe de CRUD de usuarios, reglas de negocio del dominio

AuthService **usa** UsersService (no al reves). Esto evita dependencias circulares.


---

## Slide 10 — Paso 7: Strategies de Passport (JWT y Local)

Passport usa el patron **Strategy** para manejar diferentes formas de autenticacion.

### JWT Strategy — Validar tokens en requests protegidos

```typescript
// src/users/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
```

**Como funciona?**
1. Passport extrae el token del header `Authorization: Bearer <token>`
2. Verifica la firma con `JWT_SECRET`
3. Si es valido, llama a `validate()` con el payload decodificado
4. Lo que retorna `validate()` se inyecta en `req.user`

### Local Strategy — Validar email/password en login

```typescript
// src/users/strategies/local.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../services/auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'mail',
      passwordField: 'password',
    });
  }

  async validate(email: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }
}
```

**Por que `usernameField: 'mail'`?**

Por defecto, `passport-local` busca un campo `username` en el body. Como nuestro campo se llama `mail`, lo configuramos explicitamente.

### Patron de diseno: Strategy

Este es literalmente el patron **Strategy** de GoF:
- Definimos una familia de algoritmos (JWT, Local, OAuth, etc.)
- Cada uno se encapsula en su propia clase
- Son intercambiables: el Guard decide cual usar


---

## Slide 11 — Paso 8: Guards (Proteger rutas)

Los Guards deciden si una request puede acceder a una ruta.

```typescript
// src/users/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      throw err || new Error('Unauthorized');
    }
    return user;
  }
}
```

```typescript
// src/users/guards/local-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      throw err || new Error('Unauthorized');
    }
    return user;
  }
}
```

### Como se usan?

```typescript
@UseGuards(JwtAuthGuard)   // Requiere token valido
@Get()
async getUsers() { ... }

@UseGuards(LocalAuthGuard)  // Requiere email/password validos
@Post('login')
async login() { ... }
```

### Flujo del Guard

```
Request -> Guard.canActivate() -> Strategy.validate() -> Continua o 401
```


---

## Slide 12 — Paso 9: Los Controllers

### AuthController — Endpoints de autenticacion

```typescript
// src/users/controllers/auth.controller.ts
import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { LoginUserDto } from '../dto/login-user.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { LocalAuthGuard } from '../guards/local-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.userId);
  }
}
```

### UsersController — CRUD de usuarios (evolucionado)

Comparado con nuestro controller original, ahora:
- Tiene mas endpoints (GET by id, PUT, DELETE)
- Protege rutas con `@UseGuards(JwtAuthGuard)`
- Usa la ruta `POST /users` en vez de `POST /users/create` (mas RESTful)

```typescript
// src/users/controllers/users.controller.ts
import { Body, Controller, Get, Post, UseGuards, Param, Delete, Put } from '@nestjs/common';
import { CreateUserDto } from '../dto/create-user.dto';
import { UsersService } from '../services/users.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getUsers() {
    return this.usersService.findAllUsers();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateUser(@Param('id') id: string, @Body() updateData: any) {
    return this.usersService.update(id, updateData);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
```

### Por que dos controllers en el mismo modulo?

Cada controller maneja un **recurso/ruta** diferente:
- `AuthController` -> `/auth/*`
- `UsersController` -> `/users/*`

Esto es **cohesion funcional**: cada controller agrupa endpoints relacionados. Ambos viven en el mismo modulo porque pertenecen al mismo dominio.


---

## Slide 13 — Paso 10: El Modulo (donde todo se conecta)

El modulo es donde **registramos las dependencias** y NestJS resuelve la inyeccion.

### Antes (estado actual)

```typescript
// src/users/users.module.ts (actual)
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './dto/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

### Despues

```typescript
// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User, UserSchema } from './schemas/user.schema';
import { UsersController } from './controllers/users.controller';
import { AuthController } from './controllers/auth.controller';
import { UsersService } from './services/users.service';
import { AuthService } from './services/auth.service';
import { UsersRepository } from './repositories/users.repository';
import { UsersMongooseDao } from './dao/users.mongoose.dao';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRATION') || '1h',
        } as any,
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [UsersController, AuthController],
  providers: [
    UsersService,
    AuthService,
    {
      provide: 'IUsersDao',
      useClass: UsersMongooseDao,
    },
    {
      provide: 'IUsersRepository',
      useClass: UsersRepository,
    },
    JwtStrategy,
    LocalStrategy,
  ],
  exports: [UsersService, AuthService],
})
export class UsersModule {}
```

### Desglose de cada seccion

#### `imports` — Modulos externos que necesitamos

| Import | Para que? |
|--------|-----------|
| `MongooseModule.forFeature(...)` | Registra el modelo `User` para poder inyectarlo con `@InjectModel` |
| `PassportModule` | Habilita el sistema de strategies y guards |
| `JwtModule.registerAsync(...)` | Configura JWT leyendo el secret desde `.env` |

#### `controllers` — Quien recibe las requests

```typescript
controllers: [UsersController, AuthController],
```

Dos controllers, dos prefijos de ruta (`/users`, `/auth`), un solo modulo.

#### `providers` — La inyeccion de dependencias (lo mas importante)

```typescript
providers: [
  UsersService,
  AuthService,
  {
    provide: 'IUsersDao',        // Token de inyeccion
    useClass: UsersMongooseDao,  // Implementacion concreta
  },
  {
    provide: 'IUsersRepository',
    useClass: UsersRepository,
  },
  JwtStrategy,
  LocalStrategy,
],
```

**Que es `provide` / `useClass`?**

Es la forma de decirle a NestJS: "Cuando alguien pida `'IUsersDao'`, dale una instancia de `UsersMongooseDao`".

Esto es **Dependency Inversion en accion**:
- En el codigo usamos: `@Inject('IUsersDao') private dao: IUsersDao`
- En el modulo decidimos: `useClass: UsersMongooseDao`

Si manana queremos usar PostgreSQL:
```typescript
{
  provide: 'IUsersDao',
  useClass: UsersPostgresDao,  // Solo cambiamos esta linea
}
```

#### `exports` — Que exponemos a otros modulos

```typescript
exports: [UsersService, AuthService],
```

Si otro modulo necesita acceder a la logica de usuarios o auth, puede importar `UsersModule` y usar estos services.


---

## Slide 14 — El AppModule (raiz)

El AppModule no cambia mucho. Solo dejamos de importar un `AuthModule` separado (porque ya no existe).

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    UsersModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

### Puntos clave

- `ConfigModule.forRoot({ isGlobal: true })` - Hace que `ConfigService` este disponible en TODA la app sin importarlo en cada modulo.
- `MongooseModule.forRootAsync(...)` - Conecta a MongoDB usando la URI del `.env`.
- Solo importamos `UsersModule` - Todo (users + auth) vive ahi.

### Variables de entorno necesarias (.env)

```env
MONGODB_URI=mongodb://localhost:27017/mi-app
JWT_SECRET=mi-secret-super-seguro
JWT_EXPIRATION=1h
```

---

## Slide 15 — Resumen de principios SOLID aplicados

| Principio | Donde se aplica | Ejemplo |
|-----------|----------------|---------|
| **S** Single Responsibility | Cada capa tiene una sola razon para cambiar | DAO solo hace queries, Service solo logica de negocio |
| **O** Open/Closed | Repository abierto a extension | Puedo agregar cache sin modificar el DAO |
| **L** Liskov Substitution | Implementaciones intercambiables | `UsersMongooseDao` puede reemplazarse por `UsersPostgresDao` |
| **I** Interface Segregation | Interfaces especificas | `IUsersDao` solo expone lo necesario, no todo Mongoose |
| **D** Dependency Inversion | Inyeccion por interfaz | Service depende de `IUsersRepository`, no de una clase concreta |

---

## Slide 16 — Flujo completo de un request

### Ejemplo: `POST /auth/register`

```
1. Cliente envia POST /auth/register con body { name, surname, mail, password }
2. NestJS valida el body contra CreateUserDto (class-validator)
   - Si falla: responde 400 Bad Request automaticamente
3. AuthController.register() recibe el DTO validado
4. AuthService.register():
   a. Busca si el email ya existe (via UsersService -> Repository -> DAO -> MongoDB)
   b. Si existe: lanza ConflictException (409)
   c. Hashea el password con bcrypt (10 salt rounds)
   d. Crea el usuario (via UsersService -> Repository -> DAO -> MongoDB)
5. UsersService.create():
   a. Verifica unicidad del email (doble check)
   b. Delega al Repository -> DAO -> MongoDB
   c. Transforma la respuesta con UserResponseDto (sin password)
6. Respuesta al cliente: { id, name, surname, mail, role, ... }
```

### Ejemplo: `GET /users` (protegido)

```
1. Cliente envia GET /users con header Authorization: Bearer <token>
2. JwtAuthGuard intercepta la request
3. JwtStrategy.validate():
   a. Extrae el token del header
   b. Verifica firma con JWT_SECRET
   c. Decodifica payload -> { sub, email, role }
   d. Retorna { userId, email, role } -> se inyecta en req.user
4. Guard permite el acceso
5. UsersController.getUsers() -> UsersService -> Repository -> DAO -> MongoDB
6. Respuesta: array de UserResponseDto[]
```

---

## Slide 17 — Estructura final vs estructura original

### ANTES (ultimo commit)

```
src/
├── app.module.ts
├── main.ts
└── users/
    ├── users.module.ts          # 1 modulo simple
    ├── users.controller.ts      # 2 endpoints sin proteccion
    ├── users.service.ts         # Habla directo con Mongoose
    └── dto/
        ├── create_user.dto.ts   # Solo name, surname, mail
        └── schemas/
            └── user.schema.ts   # Sin password, sin role
```

### DESPUES (resultado final)

```
src/users/
├── users.module.ts              # Modulo unificado (users + auth)
├── controllers/
│   ├── auth.controller.ts       # POST /auth/register, POST /auth/login, GET /auth/profile
│   └── users.controller.ts      # CRUD /users (protegido con JWT)
├── services/
│   ├── auth.service.ts          # JWT, bcrypt, validacion de credenciales
│   └── users.service.ts         # Logica de negocio de usuarios
├── repositories/
│   └── users.repository.ts      # Interfaz + implementacion (usa DAO)
├── dao/
│   └── users.mongoose.dao.ts    # Interfaz + implementacion Mongoose
├── dto/
│   ├── create-user.dto.ts       # Validacion de entrada (con password)
│   ├── login-user.dto.ts        # Validacion de entrada para login
│   └── user-response.dto.ts     # Transformacion de salida (sin password)
├── schemas/
│   └── user.schema.ts           # Schema con password, role, isActive
├── guards/
│   ├── jwt-auth.guard.ts        # Protege rutas con JWT
│   └── local-auth.guard.ts      # Valida email/password en login
└── strategies/
    ├── jwt.strategy.ts          # Extrae y valida JWT del header
    └── local.strategy.ts        # Valida credenciales contra la DB
```

---

## Slide 18 — Preguntas para reflexionar

1. **Que pasa si quiero agregar autenticacion con Google OAuth?**
   Creo una nueva strategy (`google.strategy.ts`) y un nuevo guard. No toco el DAO ni el Repository.

2. **Que pasa si quiero migrar de MongoDB a PostgreSQL?**
   Creo `UsersPostgresDao` que implemente `IUsersDao`, cambio el `useClass` en el modulo. No toco Services ni Controllers.

3. **Que pasa si quiero agregar cache Redis?**
   Lo agrego en el Repository. No toco el DAO ni el Service.

4. **Por que no poner el hash de bcrypt en el DAO?**
   Porque el hashing es logica de negocio/seguridad, no logica de persistencia. El DAO solo sabe guardar y leer datos.

5. **Por que no separar auth en su propio modulo?**
   Podriamos, pero para una app estandar con JWT genera acoplamiento innecesario. Si auth crece a OAuth/SSO/multi-tenant, ahi si conviene extraerlo.
