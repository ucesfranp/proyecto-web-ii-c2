/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from 'mongoose';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Schema({ timestamps: true }) //Defino lo que va a estar en la base de datos
export class User extends Document {
    @Prop({ require: true})
    name: string;

    @Prop({ require: true})
    surname: string;

    @Prop({ require: true, unique: true})
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

