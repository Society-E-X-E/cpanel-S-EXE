const mockSend = jest.fn();
const mockSendEmailCommand = jest.fn((input) => ({ input }));

jest.mock("@aws-sdk/client-sesv2", () => ({
  SESv2Client: jest.fn(() => ({ send: (...args) => mockSend(...args) })),
  SendEmailCommand: jest.fn((input) => mockSendEmailCommand(input)),
}));

import { sendSecurityCode, SECURITY_EMAIL_TEMPLATE_NAME } from "../../lib/mailer";

describe("SES security-code email", () => {
  const originalRegion = process.env.AWS_REGION;
  const originalFrom = process.env.SES_FROM_EMAIL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AWS_REGION = "us-east-1";
    process.env.SES_FROM_EMAIL = "security@example.com";
    mockSend.mockResolvedValue({});
  });

  afterAll(() => {
    if (originalRegion === undefined) delete process.env.AWS_REGION;
    else process.env.AWS_REGION = originalRegion;
    if (originalFrom === undefined) delete process.env.SES_FROM_EMAIL;
    else process.env.SES_FROM_EMAIL = originalFrom;
  });

  it("sends reset codes through the managed SES template", async () => {
    await sendSecurityCode({
      email: "member@example.com",
      code: "00123456",
      purpose: "password_reset",
    });

    const command = mockSendEmailCommand.mock.calls[0][0];
    expect(command.Content.Template.TemplateName).toBe(SECURITY_EMAIL_TEMPLATE_NAME);
    expect(JSON.parse(command.Content.Template.TemplateData)).toEqual({
      action: "restablecer tu contraseña",
      code: "00123456",
      expiresInMinutes: 10,
    });
    expect(command.Destination.ToAddresses).toEqual(["member@example.com"]);
  });

  it("uses the same managed template for email verification", async () => {
    await sendSecurityCode({
      email: "member@example.com",
      code: "87654321",
      purpose: "email_verification",
    });

    const command = mockSendEmailCommand.mock.calls[0][0];
    expect(command.Content.Template.TemplateName).toBe(SECURITY_EMAIL_TEMPLATE_NAME);
    expect(JSON.parse(command.Content.Template.TemplateData).action).toBe("verificar tu correo");
  });

  it("rejects unknown purposes and malformed codes without sending", async () => {
    await expect(sendSecurityCode({
      email: "member@example.com",
      code: "12345678",
      purpose: "unknown",
    })).rejects.toThrow("A valid security-code purpose and eight-digit code are required.");
    await expect(sendSecurityCode({
      email: "member@example.com",
      code: "123",
      purpose: "email_verification",
    })).rejects.toThrow("A valid security-code purpose and eight-digit code are required.");
    expect(mockSend).not.toHaveBeenCalled();
  });
});
