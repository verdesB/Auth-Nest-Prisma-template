import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer'

@Injectable()
export class MailerService {

    private async transporter() {
        const testAccount = await nodemailer.createTestAccount()
        const transport = nodemailer.createTransport({
            host: "localhost",
            port: 1025,
            ignoreTLS: true,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        })
        return transport
    }

    async sendSignupConfirmation(userEmail: string) {
        (await this.transporter()).sendMail({
            from: "app@localhost.com",
            to: userEmail,
            subject: "Welcome!",
            html: "<h3>Confirmation d'inscription</h3>"
        })
    }

    async sendResetPassword(userEmail: string, url: string, code: string) {
        (await this.transporter()).sendMail({
            from: "app@localhost.com",
            to: userEmail,
            subject: "Réinitialisation du mot de passe",
            html: `
            <a href="${url}">Reset password</a>
            <p>Secret code <strong>${code}</strong></p>
            <p>code will expire in 15min</p>
            `
        })
    }
}
