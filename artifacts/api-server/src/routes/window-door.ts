import { randomUUID } from "node:crypto";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { Router, type IRouter } from "express";
import {
  CalculateEstimateBody,
  CalculateEstimateResponse,
  CreateQuoteBody,
  CreateQuoteResponse,
  GetBusinessSettingsResponse,
  GetDashboardSummaryResponse,
  ListProductsQueryParams,
  ListProductsResponse,
  ListQuotesQueryParams,
  ListQuotesResponse,
  UpdateBusinessSettingsBody,
  UpdateBusinessSettingsResponse,
  UpdateProductBody,
  UpdateProductParams,
  UpdateProductResponse,
  UpdateQuoteBody,
  UpdateQuoteParams,
  UpdateQuoteResponse,
} from "@workspace/api-zod";
import {
  businessSettingsTable,
  db,
  productsTable,
  quotesTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function calculatePrice(
  productId: string,
  quantity: number,
  includeInstallation: boolean,
  includeRemoval: boolean,
) {
  const [product] = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.id, productId), eq(productsTable.active, true)));
  if (!product) return null;

  const [settings] = await db.select().from(businessSettingsTable);
  if (!settings) throw new Error("Business estimate settings are not configured");

  const low =
    (product.startingPrice +
      (includeInstallation ? settings.installationPerUnit : 0) +
      (includeRemoval ? settings.removalPerUnit : 0)) *
    quantity;
  const high = Math.ceil(low * (1 + settings.estimateBufferPercent / 100));
  return { low, high, currency: settings.currency, quantity };
}

router.get("/products", async (req, res): Promise<void> => {
  const parsed = ListProductsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const includeInactive = req.query.includeInactive === "true";
  if (includeInactive && !getAuth(req).userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const products = await db
    .select()
    .from(productsTable)
    .where(
      includeInactive ? undefined : eq(productsTable.active, true),
    )
    .orderBy(desc(productsTable.featured), productsTable.name);

  res.json(ListProductsResponse.parse(products));
});

router.patch(
  "/products/:productId",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = UpdateProductParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = UpdateProductBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const [product] = await db
      .update(productsTable)
      .set(body.data)
      .where(eq(productsTable.id, params.data.productId))
      .returning();
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json(UpdateProductResponse.parse(product));
  },
);

router.post("/estimates", async (req, res): Promise<void> => {
  const body = CalculateEstimateBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const estimate = await calculatePrice(
    body.data.productId,
    body.data.quantity,
    body.data.includeInstallation,
    body.data.includeRemoval,
  );
  if (!estimate) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(CalculateEstimateResponse.parse(estimate));
});

router.get("/quotes", requireAuth, async (req, res): Promise<void> => {
  const query = ListQuotesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [];
  if (query.data.status) {
    conditions.push(eq(quotesTable.status, query.data.status));
  }
  const search = query.data.search?.trim();
  if (search) {
    const match = `%${search}%`;
    conditions.push(
      or(
        ilike(quotesTable.name, match),
        ilike(quotesTable.email, match),
        ilike(quotesTable.phone, match),
        ilike(quotesTable.postalCode, match),
      )!,
    );
  }

  const quotes = await db
    .select()
    .from(quotesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(quotesTable.createdAt));
  res.json(ListQuotesResponse.parse(quotes));
});

router.post("/quotes", async (req, res): Promise<void> => {
  const body = CreateQuoteBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const estimate = await calculatePrice(
    body.data.productId,
    body.data.quantity,
    body.data.includeInstallation,
    body.data.includeRemoval,
  );
  if (!estimate) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const [quote] = await db
    .insert(quotesTable)
    .values({
      id: randomUUID(),
      name: body.data.name,
      email: body.data.email,
      phone: body.data.phone,
      postalCode: body.data.postalCode,
      projectType: body.data.projectType,
      productId: body.data.productId,
      quantity: body.data.quantity,
      timeframe: body.data.timeframe,
      includeInstallation: body.data.includeInstallation,
      includeRemoval: body.data.includeRemoval,
      estimateLow: estimate.low,
      estimateHigh: estimate.high,
      status: "new",
      notes: body.data.notes ?? null,
      adminNote: null,
    })
    .returning();

  res.status(201).json(CreateQuoteResponse.parse(quote));
});

router.patch(
  "/quotes/:quoteId",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = UpdateQuoteParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = UpdateQuoteBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const [quote] = await db
      .update(quotesTable)
      .set(body.data)
      .where(eq(quotesTable.id, params.data.quoteId))
      .returning();
    if (!quote) {
      res.status(404).json({ error: "Quote not found" });
      return;
    }
    res.json(UpdateQuoteResponse.parse(quote));
  },
);

router.get(
  "/admin/summary",
  requireAuth,
  async (_req, res): Promise<void> => {
    const quotes = await db.select().from(quotesTable);
    const openQuotes = quotes.filter(
      (quote) => quote.status !== "won" && quote.status !== "lost",
    );
    const summary = {
      totalLeads: quotes.length,
      newLeads: quotes.filter((quote) => quote.status === "new").length,
      scheduledLeads: quotes.filter((quote) => quote.status === "scheduled")
        .length,
      wonLeads: quotes.filter((quote) => quote.status === "won").length,
      pipelineValue: openQuotes.reduce(
        (total, quote) => total + quote.estimateLow,
        0,
      ),
      recentQuotes: quotes
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5),
    };
    res.json(GetDashboardSummaryResponse.parse(summary));
  },
);

router.get(
  "/admin/settings",
  async (_req, res): Promise<void> => {
    const [settings] = await db.select().from(businessSettingsTable);
    if (!settings) {
      res.status(503).json({ error: "Business settings are not configured" });
      return;
    }
    res.json(GetBusinessSettingsResponse.parse(settings));
  },
);

router.patch(
  "/admin/settings",
  requireAuth,
  async (req, res): Promise<void> => {
    const body = UpdateBusinessSettingsBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const [settings] = await db
      .update(businessSettingsTable)
      .set(body.data)
      .returning();
    if (!settings) {
      res.status(503).json({ error: "Business settings are not configured" });
      return;
    }
    res.json(UpdateBusinessSettingsResponse.parse(settings));
  },
);

export default router;
