import { db } from "../config/database";
import { users } from "../infrastructure/database/drizzle/schema/users";
import { categories } from "../infrastructure/database/drizzle/schema/categories";
import { products } from "../infrastructure/database/drizzle/schema/products";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

const categoryData = [
  { name: "Electronics", slug: "electronics", description: "Gadgets, devices, and tech accessories" },
  { name: "Clothing", slug: "clothing", description: "Apparel, footwear, and accessories" },
  { name: "Home & Garden", slug: "home-garden", description: "Furniture, decor, and outdoor living" },
  { name: "Books", slug: "books", description: "Fiction, non-fiction, and educational titles" },
  { name: "Sports", slug: "sports", description: "Equipment, gear, and activewear" },
];

const productData: Array<{
  name: string; slug: string; description: string; price: string; stock: number; categorySlug: string; imageUrl: string | null;
}> = [
  { name: "Wireless Bluetooth Headphones", slug: "wireless-bluetooth-headphones", description: "Premium noise-canceling wireless headphones with 30-hour battery life, comfortable over-ear design, and crystal-clear audio.", price: "79.99", stock: 45, categorySlug: "electronics", imageUrl: null },
  { name: "Smart Watch Pro", slug: "smart-watch-pro", description: "Advanced fitness tracking smartwatch with heart rate monitor, GPS, sleep tracking, and 7-day battery life.", price: "199.99", stock: 30, categorySlug: "electronics", imageUrl: null },
  { name: "USB-C Hub 7-in-1", slug: "usb-c-hub-7-in-1", description: "Compact multi-port adapter with HDMI, USB-A, SD card reader, and PD charging — perfect for laptops and tablets.", price: "34.99", stock: 120, categorySlug: "electronics", imageUrl: null },
  { name: "Portable Bluetooth Speaker", slug: "portable-bluetooth-speaker", description: "Waterproof portable speaker with rich bass, 12-hour playback, and built-in microphone for calls.", price: "49.99", stock: 65, categorySlug: "electronics", imageUrl: null },
  { name: "Organic Cotton T-Shirt", slug: "organic-cotton-tshirt", description: "Soft, breathable organic cotton tee. Pre-shrunk, relaxed fit, available in multiple colors.", price: "24.99", stock: 200, categorySlug: "clothing", imageUrl: null },
  { name: "Denim Jacket", slug: "denim-jacket", description: "Classic denim jacket with a modern slim fit. Features button front, chest pockets, and adjustable waist tabs.", price: "89.99", stock: 35, categorySlug: "clothing", imageUrl: null },
  { name: "Running Sneakers", slug: "running-sneakers", description: "Lightweight cushioned running shoes with responsive foam sole and breathable mesh upper.", price: "119.99", stock: 50, categorySlug: "clothing", imageUrl: null },
  { name: "Ceramic Plant Pot Set", slug: "ceramic-plant-pot-set", description: "Set of 3 hand-crafted ceramic plant pots with drainage holes. Minimalist matte finish in earth tones.", price: "39.99", stock: 80, categorySlug: "home-garden", imageUrl: null },
  { name: "Scented Soy Candle", slug: "scented-soy-candle", description: "Hand-poured soy wax candle with essential oils. 40-hour burn time in a reusable glass jar. Lavender & chamomile.", price: "18.99", stock: 150, categorySlug: "home-garden", imageUrl: null },
  { name: "Stainless Steel Water Bottle", slug: "stainless-steel-water-bottle", description: "Double-wall insulated bottle keeps drinks cold 24h or hot 12h. 750ml capacity, BPA-free.", price: "29.99", stock: 200, categorySlug: "home-garden", imageUrl: null },
  { name: "The Art of Clean Code", slug: "the-art-of-clean-code", description: "A practical guide to writing maintainable, readable, and efficient code. Covers patterns, refactoring, and testing.", price: "34.99", stock: 90, categorySlug: "books", imageUrl: null },
  { name: "JavaScript: The Good Parts", slug: "javascript-the-good-parts", description: "Deep dive into the core features of JavaScript. Essential reading for any serious web developer.", price: "29.99", stock: 60, categorySlug: "books", imageUrl: null },
  { name: "Yoga Mat Premium", slug: "yoga-mat-premium", description: "Extra-thick 6mm non-slip yoga mat with alignment lines. Eco-friendly TPE material, includes carrying strap.", price: "44.99", stock: 75, categorySlug: "sports", imageUrl: null },
  { name: "Resistance Bands Set", slug: "resistance-bands-set", description: "Set of 5 resistance bands with varying tension levels. Includes door anchor, handles, and carrying bag.", price: "22.99", stock: 100, categorySlug: "sports", imageUrl: null },
  { name: "Adjustable Dumbbell Set", slug: "adjustable-dumbbell-set", description: "Space-saving adjustable dumbbells ranging from 5lb to 52.5lb each. Quick-change weight selection.", price: "299.99", stock: 20, categorySlug: "sports", imageUrl: null },
];

export async function seed(): Promise<void> {
  const existingCategories = await db.execute(sql`SELECT count(*)::int as cnt FROM categories`);
  if (existingCategories[0].cnt > 0) {
    console.log("Database already seeded — skipping.");
    return;
  }

  console.log("Seeding database...");

  const [existingAdmin] = await db.select({ id: users.id }).from(users).where(sql`email = 'admin@shopflow.com'`).limit(1);
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("admin123", 12);
    await db.insert(users).values({
      id: crypto.randomUUID(),
      email: "admin@shopflow.com",
      passwordHash,
      name: "Admin",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("  Created admin user (admin@shopflow.com / admin123)");
  } else {
    console.log("  Admin user already exists — skipping");
  }

  const categoryMap = new Map<string, string>();
  for (const cat of categoryData) {
    const id = crypto.randomUUID();
    await db.insert(categories).values({ id, ...cat, createdAt: new Date(), updatedAt: new Date() });
    categoryMap.set(cat.slug, id);
  }
  console.log(`  Created ${categoryData.length} categories`);

  for (const prod of productData) {
    await db.insert(products).values({
      id: crypto.randomUUID(),
      name: prod.name,
      slug: prod.slug,
      description: prod.description,
      price: prod.price,
      stock: prod.stock,
      categoryId: categoryMap.get(prod.categorySlug) ?? null,
      imageUrl: prod.imageUrl,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  console.log(`  Created ${productData.length} products`);

  console.log("Seeding complete.");
}

const isDirectRun = process.argv[1]?.includes("seed");
if (isDirectRun) {
  seed()
    .then(() => { process.exit(0); })
    .catch((err) => { console.error("Seed failed:", err); process.exit(1); });
}
