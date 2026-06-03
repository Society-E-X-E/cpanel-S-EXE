import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error("JWT_SECRET environment variable is required. Do not use a hardcoded fallback.");
}

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