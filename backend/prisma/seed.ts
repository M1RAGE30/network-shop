import "dotenv/config";
import { PrismaClient, Prisma } from "../generated/client";
import bcrypt from "bcrypt";
import * as fs from "fs";
import * as path from "path";
import { createMysqlAdapter } from "../src/lib/db-adapter";
import { normalizeProductSpecs } from "../src/lib/specNormalize";

const prisma = new PrismaClient({ adapter: createMysqlAdapter() });

const categoryMapping: Record<string, string> = {
  Маршрутизаторы: "routers",
  "Wi-Fi адаптеры": "wifi-adapters",
  Коммутаторы: "switches",
  "Точки доступа, усилители сигнала": "access-points",
  "USB ethernet адаптеры": "usb-adapters",
  "Сетевые накопители": "storage",
  "Патч-корды": "patch-cords",
  "Патч-корды (Ethernet)": "patch-cords",
};

function normalizeCategoryName(name: string): string {
  if (name === "Патч-корды (Ethernet)") return "Патч-корды";
  return name;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface ParsedProduct {
  title: string;
  price: string;
  category: string;
  brand: string;
  description: string;
  image_url: string;
  specifications: Record<string, string>;
}

async function seedAdmin() {
  const existing = await prisma.user.findUnique({
    where: { email: "admin@networkshop.by" },
  });
  if (!existing) {
    const password = await bcrypt.hash("Admin123!", 10);
    await prisma.user.create({
      data: {
        email: "admin@networkshop.by",
        password,
        name: "Администратор",
        role: "ADMIN",
        isEmailVerified: true,
      },
    });
    console.log("Admin created: admin@networkshop.by / Admin123!");
  } else {
    console.log("Admin already exists");
  }
}

async function clearProducts() {
  await prisma.review.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.brand.deleteMany();
  console.log("Cleared all products, categories and brands");
}

async function seedFromJson(jsonPath: string) {
  console.log(`Loading products from: ${jsonPath}`);
  const data: ParsedProduct[] = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  console.log(`Found ${data.length} products`);

  await clearProducts();

  const categoryNames = [
    ...new Set(data.map((p) => normalizeCategoryName(p.category))),
  ];
  for (const catName of categoryNames) {
    const slug = categoryMapping[catName] ?? slugify(catName);
    await prisma.category.create({
      data: { name: catName, slug, imageUrl: null },
    });
    console.log(`Category: ${catName} (${slug})`);
  }

  const brandNames = [
    ...new Set(data.map((p) => p.brand).filter((b) => b?.trim())),
  ];
  for (const brandName of brandNames) {
    await prisma.brand.create({ data: { name: brandName, logoUrl: null } });
  }
  const unknownBrand = await prisma.brand.create({
    data: { name: "Другое", logoUrl: null },
  });
  console.log(`Brands created: ${brandNames.length + 1}`);

  const categoriesMap = new Map(
    (await prisma.category.findMany()).map((c) => [c.name, c]),
  );
  const brandsMap = new Map(
    (await prisma.brand.findMany()).map((b) => [b.name, b]),
  );

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const item of data) {
    try {
      if (!item.title || !item.price) {
        skipped++;
        continue;
      }
      const price = parseFloat(item.price);
      if (isNaN(price) || price <= 0) {
        skipped++;
        continue;
      }
      const slug = slugify(item.title);
      if (!slug) {
        skipped++;
        continue;
      }
      const category = categoriesMap.get(normalizeCategoryName(item.category));
      if (!category) {
        skipped++;
        continue;
      }
      const brand =
        (item.brand?.trim() ? brandsMap.get(item.brand) : null) ?? unknownBrand;
      const specs: Prisma.InputJsonValue | typeof Prisma.JsonNull =
        item.specifications && Object.keys(item.specifications).length > 0
          ? (normalizeProductSpecs(item.specifications) ??
            item.specifications)
          : Prisma.JsonNull;

      await prisma.product.upsert({
        where: { slug },
        update: {
          name: item.title,
          description: item.description || null,
          price,
          imageUrl: item.image_url || null,
          specs,
          categoryId: category.id,
          brandId: brand.id,
        },
        create: {
          name: item.title,
          slug,
          description: item.description || null,
          price,
          stock: Math.floor(Math.random() * 50) + 5,
          imageUrl: item.image_url || null,
          specs,
          categoryId: category.id,
          brandId: brand.id,
        },
      });
      imported++;
      if (imported % 50 === 0) console.log(`  Imported: ${imported}...`);
    } catch (error: unknown) {
      errors++;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  Error "${item.title}": ${message}`);
    }
  }

  console.log(`Imported: ${imported}, skipped: ${skipped}, errors: ${errors}`);
}

async function normalizeExistingProductSpecs() {
  const products = await prisma.product.findMany({
    select: { id: true, specs: true },
  });
  let updated = 0;

  for (const product of products) {
    const normalized = normalizeProductSpecs(product.specs);
    if (!normalized) continue;
    if (JSON.stringify(product.specs) === JSON.stringify(normalized)) continue;
    await prisma.product.update({
      where: { id: product.id },
      data: { specs: normalized },
    });
    updated += 1;
  }

  if (updated > 0) {
    console.log(`Normalized specs for ${updated} products`);
  }
}

async function main() {
  await seedAdmin();

  const forceSeed = process.env.FORCE_SEED === "true";
  const productCount = await prisma.product.count();
  if (productCount > 0 && !forceSeed) {
    console.log(
      `Skip seed: ${productCount} products already in DB (FORCE_SEED=true to re-import)`,
    );
    await normalizeExistingProductSpecs();
    return;
  }

  const jsonPath = process.env.SEED_JSON
    ? path.resolve(process.env.SEED_JSON)
    : path.resolve(process.cwd(), "products.json");

  console.log(`Looking for products.json at: ${jsonPath}`);

  if (!fs.existsSync(jsonPath)) {
    console.error(`products.json not found at ${jsonPath}. Seed aborted.`);
    process.exit(1);
  }

  await seedFromJson(jsonPath);
  await normalizeExistingProductSpecs();
  console.log("Seed complete.");
}

main().finally(() => prisma.$disconnect());
