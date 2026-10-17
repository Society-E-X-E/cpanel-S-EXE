import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

let client;

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
  const subject = purpose === "password_reset"
    ? "Código para restablecer tu contraseña · Society . E X E"
    : "Código para verificar tu correo · Society . E X E";
  const action = purpose === "password_reset" ? "restablecer tu contraseña" : "verificar tu correo";

  await getClient().send(new SendEmailCommand({
    FromEmailAddress: process.env.SES_FROM_EMAIL,
    Destination: { ToAddresses: [email] },
    Content: {
      Simple: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: {
          Text: {
            Data: `Usa este código para ${action}: ${code}\n\nEl código vence en 10 minutos y solo puede utilizarse una vez. Si no solicitaste esta acción, ignora este mensaje y avisa a un administrador.\n\nSociety . E X E`,
            Charset: "UTF-8",
          },
        },
      },
    },
  }));
}
