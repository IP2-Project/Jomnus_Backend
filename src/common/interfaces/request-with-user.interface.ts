import { UserEntity } from "@/users/entity/user.entity";
import { Request } from "express";

export interface RequestWithUser extends Request{
    user: UserEntity
}