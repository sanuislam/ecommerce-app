import "server-only";
import crypto from "node:crypto";

export function cloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

export type CloudinarySignParams = {
  timestamp: number;
  folder?: string;
};

export function signCloudinaryUpload(params: CloudinarySignParams): {
  signature: string;
  apiKey: string;
  cloudName: string;
  timestamp: number;
  folder?: string;
} {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? "";
  const apiKey = process.env.CLOUDINARY_API_KEY ?? "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET ?? "";
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary is not configured");
  }
  const toSign: Record<string, string | number> = {
    timestamp: params.timestamp,
  };
  if (params.folder) toSign.folder = params.folder;
  const sortedKeys = Object.keys(toSign).sort();
  const stringToSign = sortedKeys
    .map((k) => `${k}=${toSign[k]}`)
    .join("&");
  const signature = crypto
    .createHash("sha1")
    .update(stringToSign + apiSecret)
    .digest("hex");
  return {
    signature,
    apiKey,
    cloudName,
    timestamp: params.timestamp,
    folder: params.folder,
  };
}

/** Is this a photo our customers uploaded to our Cloudinary folder (reviews / returns)? */
export function isCustomerPhoto(url: string, folder: "eidbazar/reviews" | "eidbazar/returns"): boolean {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloud) return false;
  return (
    url.length < 400 &&
    url.startsWith(`https://res.cloudinary.com/${cloud}/image/upload/`) &&
    url.includes(`/${folder}/`)
  );
}
