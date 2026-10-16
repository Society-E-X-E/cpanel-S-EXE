const jwt = require("jsonwebtoken");
const SECRET = "test-secret-with-at-least-thirty-two-characters";
process.env.JWT_SECRET = SECRET;
const { signToken, verifyToken } = require("../../lib/auth");

describe("lib/auth", () => {
  it("creates an expiring token", () => {
    const token = signToken({ userId: 12 });
    const decoded = jwt.verify(token, SECRET);
    expect(decoded.userId).toBe(12);
    expect(decoded.exp - decoded.iat).toBe(3600);
  });

  it("rejects invalid, expired and incorrectly signed tokens", () => {
    expect(verifyToken("invalid.token.string")).toBeNull();
    expect(verifyToken(jwt.sign({ userId: 1 }, SECRET, { expiresIn: "-1s" }))).toBeNull();
    expect(verifyToken(jwt.sign({ userId: 1 }, "wrong-secret", { expiresIn: "1h" }))).toBeNull();
  });

  it("does not use an insecure default when the secret is missing", () => {
    const configuredSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    expect(() => signToken({ userId: 1 })).toThrow("JWT_SECRET");
    process.env.JWT_SECRET = configuredSecret;
  });
});
