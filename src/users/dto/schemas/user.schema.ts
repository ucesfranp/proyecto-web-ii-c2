/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";


@Schema({ timestamps: true })
export class User {
    @Prop({ require: true})
    name: string;

    @Prop({ require: true})
    surname: string;

    @Prop({ require: true, unique: true})
    mail: string;

}

export const UserSchema = SchemaFactory.createForClass(User);

