import { randomUUID } from "node:crypto";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CalculateEstimateBody,
  CalculateEstimateResponse,
  CreateProductBody,
  CreateProductResponse,
  CreateQuoteBody,
  CreateQuoteResponse,
  CreateReviewBody,
  CreateReviewResponse,
  DeleteReviewParams,
  DeleteReviewResponse,
  GetBusinessSettingsResponse,
  GetDashboardSummaryResponse,
  ListProductsQueryParams,
  ListProductsResponse,
  ListQuotesQueryParams,
  ListQuotesResponse,
  ListAdminReviewsResponse,
  ListReviewsResponse,
  UpdateBusinessSettingsBody,
  UpdateBusinessSettingsResponse,
  UpdateProductBody,
  UpdateProductParams,
  UpdateProductResponse,
  UpdateQuoteBody,
  UpdateQuoteParams,
  UpdateQuoteResponse,
  UpdateReviewBody,
  UpdateReviewParams,
  UpdateReviewResponse,
} from "@workspace/api-zod";
import {
  businessSettingsTable,
  db,
  productsTable,
  quotesTable,
  reviewsTable,
} from "@workspace/db";
import { requireAdminAuth } from "../middlewares/requireAdminAuth";

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

router.get(
  "/products",
  async (req, res, next): Promise<void> => {
    if (req.query.includeInactive !== "true") {
      next();
      return;
    }
    await requireAdminAuth(req, res, next);
  },
  async (req, res): Promise<void> => {
    const parsed = ListProductsQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const includeInactive = req.query.includeInactive === "true";
    const products = await db
      .select()
      .from(productsTable)
      .where(
        includeInactive ? undefined : eq(productsTable.active, true),
      )
      .orderBy(desc(productsTable.featured), productsTable.name);

    res.json(ListProductsResponse.parse(products));
  },
);

router.post("/products", requireAdminAuth, async (req, res): Promise<void> => {
  const body = CreateProductBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const base =
    body.data.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "product";
  let slug = base;
  let suffix = 2;
  for (;;) {
    const [existing] = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(eq(productsTable.slug, slug));
    if (!existing) break;
    slug = `${base}-${suffix++}`;
  }

  const [product] = await db
    .insert(productsTable)
    .values({
      id: randomUUID(),
      slug,
      name: body.data.name,
      category: body.data.category,
      description: body.data.description,
      startingPrice: Math.round(body.data.startingPrice),
      imageUrl: body.data.imageUrl ?? null,
      active: body.data.active ?? true,
      featured: body.data.featured ?? false,
      badge: body.data.badge ?? null,
      features: body.data.features ?? [],
    })
    .returning();

  res.status(201).json(CreateProductResponse.parse(product));
});

router.patch(
  "/products/:productId",
  requireAdminAuth,
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

router.get("/quotes", requireAdminAuth, async (req, res): Promise<void> => {
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
  requireAdminAuth,
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

router.get("/reviews", async (_req, res): Promise<void> => {
  const reviews = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.approved, true))
    .orderBy(desc(reviewsTable.createdAt));
  res.json(ListReviewsResponse.parse(reviews));
});

router.post("/reviews", async (req, res): Promise<void> => {
  const body = CreateReviewBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [review] = await db
    .insert(reviewsTable)
    .values({
      id: randomUUID(),
      name: body.data.name,
      rating: body.data.rating,
      comment: body.data.comment,
      approved: true,
    })
    .returning();

  res.status(201).json(CreateReviewResponse.parse(review));
});

router.get("/admin/reviews", requireAdminAuth, async (_req, res): Promise<void> => {
  const reviews = await db
    .select()
    .from(reviewsTable)
    .orderBy(desc(reviewsTable.createdAt));
  res.json(ListAdminReviewsResponse.parse(reviews));
});

router.patch(
  "/admin/reviews/:reviewId",
  requireAdminAuth,
  async (req, res): Promise<void> => {
    const params = UpdateReviewParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = UpdateReviewBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const [review] = await db
      .update(reviewsTable)
      .set(body.data)
      .where(eq(reviewsTable.id, params.data.reviewId))
      .returning();
    if (!review) {
      res.status(404).json({ error: "Review not found" });
      return;
    }
    res.json(UpdateReviewResponse.parse(review));
  },
);

router.delete(
  "/admin/reviews/:reviewId",
  requireAdminAuth,
  async (req, res): Promise<void> => {
    const params = DeleteReviewParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [review] = await db
      .delete(reviewsTable)
      .where(eq(reviewsTable.id, params.data.reviewId))
      .returning();
    if (!review) {
      res.status(404).json({ error: "Review not found" });
      return;
    }
    res.json(DeleteReviewResponse.parse(review));
  },
);

router.get(
  "/admin/summary",
  requireAdminAuth,
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
  requireAdminAuth,
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
