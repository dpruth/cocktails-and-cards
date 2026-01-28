const nodemailer = require('nodemailer');

let transporter = null;

function initializeEmailService() {
    // Skip initialization if SMTP is not configured
    if (!process.env.SMTP_HOST) {
        console.log('Email service: SMTP not configured, magic links will be logged to console');
        return;
    }

    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    // Verify connection
    transporter.verify((error) => {
        if (error) {
            console.error('Email service: Failed to connect to SMTP server:', error.message);
        } else {
            console.log('Email service: Connected to SMTP server');
        }
    });
}

async function sendMagicLinkEmail(email, token, playerName) {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const magicLink = `${appUrl}/#/verify?token=${token}`;
    const expiryMinutes = process.env.MAGIC_LINK_EXPIRY_MINUTES || 15;

    // If no transporter (SMTP not configured), log to console
    if (!transporter) {
        console.log('\n========================================');
        console.log('MAGIC LINK EMAIL (SMTP not configured)');
        console.log('========================================');
        console.log(`To: ${email}`);
        console.log(`Player: ${playerName || 'New user'}`);
        console.log(`Link: ${magicLink}`);
        console.log(`Expires in: ${expiryMinutes} minutes`);
        console.log('========================================\n');
        return { messageId: 'console-' + Date.now() };
    }

    const mailOptions = {
        from: process.env.EMAIL_FROM || '"Cocktails & Cards" <noreply@example.com>',
        to: email,
        subject: 'Sign in to Cocktails & Cards',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #2c3e50, #3498db); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
                    .button { display: inline-block; background: #3498db; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6c757d; }
                    .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 5px; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Cocktails & Cards</h1>
                    </div>
                    <div class="content">
                        <h2>Hello${playerName ? ` ${playerName}` : ''}!</h2>
                        <p>Click the button below to sign in to your Cocktails & Cards account:</p>
                        <p style="text-align: center; margin: 30px 0;">
                            <a href="${magicLink}" class="button">Sign In</a>
                        </p>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; background: white; padding: 10px; border-radius: 5px;">
                            ${magicLink}
                        </p>
                        <div class="warning">
                            <strong>Note:</strong> This link expires in ${expiryMinutes} minutes and can only be used once.
                        </div>
                    </div>
                    <div class="footer">
                        <p>If you didn't request this email, you can safely ignore it.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
Sign in to Cocktails & Cards

Hello${playerName ? ` ${playerName}` : ''}!

Click this link to sign in:
${magicLink}

This link expires in ${expiryMinutes} minutes and can only be used once.

If you didn't request this email, you can safely ignore it.
        `
    };

    return transporter.sendMail(mailOptions);
}

module.exports = {
    initializeEmailService,
    sendMagicLinkEmail
};
