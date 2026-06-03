import jwt from "jsonwebtoken";
import { signToken, verifyToken } from "../../lib/auth";

const SECRET = "default_secret_key_123";

describe("lib/auth", () => {
  describe("signToken", () => {
    it("returns a valid JWT string", () => {
      const token = signToken({ userId: 1, username: "admin" });
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);
    });

    it("includes payload fields in the token", () => {
      const token = signToken({ userId: 42, username: "testuser", role: "admin" });
      const decoded = jwt.verify(token, SECRET);
      expect(decoded.userId).toBe(42);
      expect(decoded.username).toBe("testuser");
      expect(decoded.role).toBe("admin");
    });

    it("sets expiration to 1 hour", () => {
      const token = signToken({ userId: 1 });
      const decoded = jwt.verify(token, SECRET);
      expect(decoded.exp - decoded.iat).toBe(3600);
    });
  });

  describe("verifyToken", () => {
    it("returns decoded payload for a valid token", () => {
      const token = signToken({ userId: 1, username: "admin", role: "admin" });
      const result = verifyToken(token);
      expect(result).not.toBeNull();
      expect(result.userId).toBe(1);
      expect(result.username).toBe("admin");
    });

    it("returns null for an invalid token", () => {
      const result = verifyToken("invalid.token.string");
      expect(result).toBeNull();
    });

    it("returns null for an expired token", () => {
      const token = jwt.sign({ userId: 1 }, SECRET, { expiresIn: "-1s" });
      const result = verifyToken(token);
      expect(result).toBeNull();
    });

    it("returns null for a token signed with wrong secret", () => {
      const token = jwt.sign({ userId: 1 }, "wrong_secret", { expiresIn: "1h" });
      const result = verifyToken(token);
      expect(result).toBeNull();
    });

    it("returns null for empty string", () => {
      const result = verifyToken("");
      expect(result).toBeNull();
    });

    it("returns null for undefined", () => {
      const result = verifyToken(undefined);
      expect(result).toBeNull();
    });
  });
});
