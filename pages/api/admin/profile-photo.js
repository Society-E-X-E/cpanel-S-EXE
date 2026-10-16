import cloudinary from "cloudinary";
import db from "../../../lib/db";
import { getCurrentUser, respondUnauthorized } from "../../../lib/session";

export const config = {
  api: {
    bodyParser: { sizeLimit: "5mb" },
  },
};

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function cloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

function detectImageType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) return "image/webp";
  return "";
}

function getUploader() {
  cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary.v2.uploader;
}

async function removeOldPhoto(uploader, publicId) {
  if (!publicId) return;
  try {
    const result = await uploader.destroy(publicId, { invalidate: true, resource_type: "image" });
    if (result.result !== "ok" && result.result !== "not found") {
      console.error("Cloudinary did not remove the previous profile photo:", result.result);
    }
  } catch (error) {
    console.error("Could not remove previous profile photo from Cloudinary:", error);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "DELETE") {
    res.setHeader("Allow", ["POST", "DELETE"]);
    return res.status(405).json({ status: "error", message: "Método no permitido." });
  }

  const user = getCurrentUser(req);
  if (!user) return respondUnauthorized(res);
  if (!cloudinaryConfigured()) {
    return res.status(503).json({ status: "error", message: "La carga de fotos aún no está configurada." });
  }

  const uploader = getUploader();
  const existing = db.prepare("SELECT avatar_public_id FROM staff_users WHERE id = ?").get(user.id);

  if (req.method === "DELETE") {
    if (existing?.avatar_public_id) {
      try {
        const result = await uploader.destroy(existing.avatar_public_id, { invalidate: true, resource_type: "image" });
        if (result.result !== "ok" && result.result !== "not found") {
          return res.status(502).json({ status: "error", message: "El proveedor no pudo quitar la foto. Intenta de nuevo." });
        }
      } catch (error) {
        console.error("Cloudinary profile-photo deletion failed:", error);
        return res.status(502).json({ status: "error", message: "No se pudo quitar la foto del proveedor." });
      }
    }
    db.prepare("UPDATE staff_users SET avatar_url = '', avatar_public_id = '' WHERE id = ?").run(user.id);
    return res.status(200).json({ status: "ok", avatarUrl: "" });
  }

  const match = typeof req.body?.image === "string"
    ? /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(req.body.image)
    : null;
  if (!match) {
    return res.status(400).json({ status: "error", message: "Elige una imagen JPEG, PNG o WebP válida." });
  }

  const claimedType = match[1];
  const encoded = match[2];
  const image = Buffer.from(encoded, "base64");
  if (
    !ACCEPTED_TYPES.has(claimedType) ||
    image.length === 0 ||
    image.length > MAX_IMAGE_BYTES ||
    image.toString("base64") !== encoded ||
    detectImageType(image) !== claimedType
  ) {
    return res.status(400).json({ status: "error", message: "La foto debe ser una imagen JPEG, PNG o WebP de hasta 3 MB." });
  }

  try {
    const uploaded = await uploader.upload(req.body.image, {
      folder: "society-exe/profile-photos",
      resource_type: "image",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation: [{ width: 512, height: 512, crop: "limit", quality: "auto", fetch_format: "auto" }],
    });
    if (!uploaded.secure_url || !uploaded.public_id) throw new Error("Cloudinary returned an incomplete upload result.");

    db.prepare("UPDATE staff_users SET avatar_url = ?, avatar_public_id = ? WHERE id = ?")
      .run(uploaded.secure_url, uploaded.public_id, user.id);
    if (existing?.avatar_public_id && existing.avatar_public_id !== uploaded.public_id) {
      await removeOldPhoto(uploader, existing.avatar_public_id);
    }
    return res.status(200).json({ status: "ok", avatarUrl: uploaded.secure_url });
  } catch (error) {
    console.error("Cloudinary profile-photo upload failed:", error);
    return res.status(502).json({ status: "error", message: "No se pudo cargar la foto. Intenta de nuevo." });
  }
}
