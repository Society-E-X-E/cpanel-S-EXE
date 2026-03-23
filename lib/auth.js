import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "default_secret_key_123";

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: "1h" });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (e) {
    return null;
  }
}