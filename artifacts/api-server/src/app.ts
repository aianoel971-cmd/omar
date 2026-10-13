import express, { type Express } from "express";
import cors from "cors";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import { clerkBypass, devAuthMiddleware } from "./middlewares/devAuth";

const uploadsDir = path.join(process.cwd(), "uploads");
try {
  mkdirSync(uploadsDir, { recursive: true });
} catch {
  // Filesystem may be read-only (e.g. Vercel serverless). Uploads use blob
  // storage when BLOB_READ_WRITE_TOKEN is set, so a missing dir is fine.
}

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(cors({ credentials: true, origin: true }));
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true, limit: "12mb" }));

if (clerkBypass) {
  app.use(devAuthMiddleware());
} else {
  app.use(
    clerkMiddleware((req) => ({
      publishableKey: publishableKeyFromHost(
        getClerkProxyHost(req) ?? "",
        process.env.CLERK_PUBLISHABLE_KEY,
      ),
    })),
  );
}

app.use("/api/uploads", express.static(uploadsDir));
app.use("/api", router);

export default app;
