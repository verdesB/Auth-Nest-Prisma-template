import { IsNotEmpty, IsEmail } from "class-validator"

export class SignupDto {
    @IsNotEmpty()
    readonly name : string
    @IsNotEmpty()
    readonly surname : string
    @IsNotEmpty()
    @IsEmail()
    readonly email : string
    @IsNotEmpty()
    readonly password : string

}