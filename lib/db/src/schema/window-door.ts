import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const productsTable = pgTable("window_door_products", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  startingPrice: integer("starting_price").notNull(),
  imageUrl: text("image_url"),
  active: boolean("active").notNull().default(true),
  featured: boolean("featured").notNull().default(false),
  badge: text("badge"),
  features: text("features").array().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const quotesTable = pgTable("window_door_quotes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  postalCode: text("postal_code").notNull(),
  projectType: text("project_type").notNull(),
  productId: text("product_id")
    .notNull()
    .references(() => productsTable.id),
  quantity: integer("quantity").notNull(),
  timeframe: text("timeframe").notNull(),
  includeInstallation: boolean("include_installation").notNull(),
  includeRemoval: boolean("include_removal").notNull(),
  estimateLow: integer("estimate_low").notNull(),
  estimateHigh: integer("estimate_high").notNull(),
  status: text("status").notNull().default("new"),
  notes: text("notes"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const businessSettingsTable = pgTable("window_door_business_settings", {
  id: text("id").primaryKey(),
  businessName: text("business_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  serviceArea: text("service_area").notNull(),
  currency: text("currency").notNull(),
  installationPerUnit: integer("installation_per_unit").notNull(),
  removalPerUnit: integer("removal_per_unit").notNull(),
  estimateBufferPercent: integer("estimate_buffer_percent").notNull(),
});
