import { Inject, Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { welcome } from '@modules/email/templates/welcome';
import { ConfigService } from '@nestjs/config';
import { resetPassword } from '@modules/email/templates/reset-password';
import { resendActivation } from '@modules/email/templates/resend-activation';

@Injectable()
export class EmailService {
  private transporter;
  private logger = new Logger(EmailService.name);

  constructor(
    @Inject(ConfigService)
    private configService: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: configService.get<string>('EMAIL_SMTP_HOST'),
      port: configService.get<number>('EMAIL_SMTP_PORT'),
      secure: configService.get<boolean>('EMAIL_SMTP_SECURE'),
      auth: {
        user: configService.get<string>('EMAIL_SMTP_USERNAME'),
        pass: configService.get<string>('EMAIL_SMTP_PASSWORD'),
      },
    });
  }

  async sendVerificationEmail(
    to: string,
    userName: string,
    subject: string,
    confirmationLink: string,
    isResend = false,
  ) {
    const template = isResend ? resendActivation : welcome;

    const html = template
      .replace(/{{userName}}/g, userName)
      .replace(/{{confirmationLink}}/g, confirmationLink);

    const mailOptions = {
      from: this.configService.get<string>('EMAIL_SMTP_FROM'),
      to,
      subject,
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Email sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(`❌ Error sending email to ${to}:`, error);
      throw error;
    }
  }

  async sendResetPasswordEmail(
    to: string,
    userName: string,
    subject: string,
    resetLink: string,
  ) {
    const html = resetPassword
      .replace(/{{userName}}/g, userName)
      .replace(/{{resetLink}}/g, resetLink);

    const mailOptions = {
      from: this.configService.get<string>('EMAIL_SMTP_FROM'),
      to,
      subject,
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Reset password email sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(
        `❌ Error sending reset password email to ${to}:`,
        error,
      );
      throw error;
    }
  }
}
