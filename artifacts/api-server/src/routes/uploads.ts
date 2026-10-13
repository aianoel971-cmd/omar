import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Router, type IRouter } from "express";
import { UploadImageBody, UploadImageResponse } from "@workspace/api-zod";
import { requireAdminAuth } from "../middlewares/requireAdminAuth";

const uploadsDir = path.join(process.cwd(), "uploads");

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

async function storeInBlob(
  filename: string,
  contentType: string,
  buffer: Buffer,
): Promise<string> {
  const response = await fetch(`https://blob.vercel-storage.com/${filename}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${BLOB_TOKEN}`,
      "x-api-version": "7",
      "x-content-type": contentType,
      "x-add-random-suffix": "0",
      "x-cache-control-max-age": "31536000",
    },
    body: buffer,
  });

  if (!response.ok) {
    throw new Error(`Blob storage responded with ${response.status}`);
  }

  const data = (await response.json()) as { url?: string };
  if (!data.url) {
    throw new Error("Blob storage did not return a URL");
  }
  return data.url;
}

function storeOnDisk(filename: string, buffer: Buffer): string {
  mkdirSync(uploadsDir, { recursive: true });
  writeFileSync(path.join(uploadsDir, filename), buffer);
  return `/api/uploads/${filename}`;
}

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_BYTES = 8 * 1024 * 1024;

const router: IRouter = Router();

router.post("/uploads", requireAdminAuth, async (req, res): Promise<void> => {
  const body = UploadImageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(
    body.data.dataUrl.trim(),
  );
  if (!match) {
    res.status(400).json({ error: "Provide a base64-encoded image data URL." });
    return;
  }

  const extension = EXTENSIONS[match[1].toLowerCase()];
  if (!extension) {
    res.status(400).json({
      error: "Unsupported image type. Use PNG, JPG, WEBP, or GIF.",
    });
    return;
  }

  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    res.status(400).json({ error: "Image must be between 1 byte and 8 MB." });
    return;
  }

  const filename = `${randomUUID()}.${extension}`;

  let url: string;
  try {
    url = BLOB_TOKEN
      ? await storeInBlob(filename, match[1].toLowerCase(), buffer)
      : storeOnDisk(filename, buffer);
  } catch {
    res.status(502).json({ error: "Image storage failed. Please try again." });
    return;
  }

  res.json(UploadImageResponse.parse({ url }));
});

export default router;
