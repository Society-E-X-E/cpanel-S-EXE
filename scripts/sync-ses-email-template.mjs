import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import {
  CreateEmailTemplateCommand,
  GetEmailTemplateCommand,
  SESv2Client,
  UpdateEmailTemplateCommand,
} from "@aws-sdk/client-sesv2";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });

if (!process.env.AWS_REGION) {
  throw new Error("AWS_REGION must be configured before syncing the SES template.");
}

const definition = JSON.parse(
  await readFile(path.join(root, "templates", "security-code.json"), "utf8"),
);
const client = new SESv2Client({ region: process.env.AWS_REGION });
const template = {
  TemplateName: definition.TemplateName,
  TemplateContent: definition.TemplateContent,
};

try {
  await client.send(new GetEmailTemplateCommand({ TemplateName: template.TemplateName }));
  await client.send(new UpdateEmailTemplateCommand(template));
  console.log(`Updated SES email template "${template.TemplateName}" in ${process.env.AWS_REGION}.`);
} catch (error) {
  if (error.name !== "NotFoundException") {
    throw error;
  }
  await client.send(new CreateEmailTemplateCommand(template));
  console.log(`Created SES email template "${template.TemplateName}" in ${process.env.AWS_REGION}.`);
}
