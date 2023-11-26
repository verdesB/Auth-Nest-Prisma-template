import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SignupDto } from './dto/signupDto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt'
import * as speakeasy from 'speakeasy'
import { MailerService } from 'src/mailer/mailer.service';
import { SigninDto } from './dto/signinDto';
import { JwtService } from '@nestjs/jwt/dist';
import { ConfigService } from '@nestjs/config';
import { ResetPasswordDemandDto } from './dto/resetPasswordDemandDto';
import { ResetPasswordConfirmationDto } from './dto/resetPasswordConfirmationDto';

@Injectable()
export class AuthService {



    constructor(private readonly prismaService: PrismaService,
        private readonly mailerService: MailerService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService) {
    }

    async resetPasswordConfirmation(resetPasswordConfirmationDto: ResetPasswordConfirmationDto) {
        const { code, email, password } = resetPasswordConfirmationDto
        const user = await this.prismaService.user.findUnique({ where: { email } })
        if (!user) { throw new NotFoundException("User not found") }
        const match = speakeasy.totp.verify({
            secret: this.configService.get("OTP_CODE"),
            token: code,
            digits: 5,
            step: 60 * 15,
            encoding: 'base32',
        })
        if (!match) throw new UnauthorizedException("Invalid/expired token")
        const hash = await bcrypt.hash(password, 10)
        await this.prismaService.user.update({ where: { email }, data : {password : hash} })
        return {data : "Password has been changed with success"}
    }

    async resetPasswordDemand(resetPasswordDemandDto: ResetPasswordDemandDto) {
        const { email } = resetPasswordDemandDto
        const user = await this.prismaService.user.findUnique({ where: { email } })
        if (!user) { throw new NotFoundException("User not found") }
        const code = speakeasy.totp({
            secret: this.configService.get("OTP_CODE"),
            digits: 5,
            step: 60 * 15,
            encoding: "base32"
        })
        const url = "http://localhost:3001/auth/reset-password-confirmation"
        await this.mailerService.sendResetPassword(email, url, code)
        return { data: " Reset password mail has been sent" }

    }

    async signin(signinDto: SigninDto) {
        const { email, password } = signinDto
        const user = await this.prismaService.user.findUnique({ where: { email } })
        if (!user) { throw new NotFoundException("User not found") }
        //comparer le mot de passe 
        const match = await bcrypt.compare(password, user.password)
        if (!match) { throw new UnauthorizedException("Veuillez verifier vos saisies") }
        //retourner un jwt
        const payload = {
            sub: user.userId,
            email: user.email,
        }
        const token = this.jwtService.sign(payload, { expiresIn: "2h", secret: this.configService.get("SECRET_KEY") })
        return {
            token, user: {
                username: user.name,
                usersurname: user.surname,
                role: user.role,
                email: user.email
            }
        }
        throw new Error('Method not implemented.');
    }
    async signup(signupDto: SignupDto) {
        const { email, name, surname, password } = signupDto
        //Vérifier si l'utilisateur est déjà inscrit
        const user = await this.prismaService.user.findUnique({ where: { email } })
        if (user) throw new ConflictException("User already exist")
        //hasher le mot de passe 
        const hash = await bcrypt.hash(password, 10)
        //enregistrer l'utilisateur en bdd
        await this.prismaService.user.create({ data: { email, name, surname, password: hash, role: "user" }, })

        //Envoyez un mail de confirmation
        await this.mailerService.sendSignupConfirmation(email)
        //Retourner une reponse de succès
        return { data: 'User succesfully created' }
    }

}
