import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import securityCodeTemplate from "../templates/security-code.json";

let client;

export const SECURITY_EMAIL_TEMPLATE_NAME = securityCodeTemplate.TemplateName;

export function validateEmailConfiguration() {
  if (!process.env.AWS_REGION || !process.env.SES_FROM_EMAIL) {
    throw new Error("AWS_REGION and SES_FROM_EMAIL must be configured for email delivery.");
  }
}

function getClient() {
  validateEmailConfiguration();
  const region = process.env.AWS_REGION;
  if (!client) client = new SESv2Client({ region });
  return client;
}

export async function sendSecurityCode({ email, code, purpose }) {
  const actions = {
    password_reset: "restablecer tu contraseña",
    email_verification: "verificar tu correo",
  };
  const action = actions[purpose];
  if (!action || !/^\d{8}$/.test(code)) {
    throw new Error("A valid security-code purpose and eight-digit code are required.");
  }

  await getClient().send(new SendEmailCommand({
    FromEmailAddress: process.env.SES_FROM_EMAIL,
    Destination: { ToAddresses: [email] },
    Content: {
      Template: {
        TemplateName: SECURITY_EMAIL_TEMPLATE_NAME,
        TemplateData: JSON.stringify({
          action,
          code,
          expiresInMinutes: 10,
        }),
      },
    },
  }));
}
