// Runs during `npm run build`. On Render (RENDER=true) it applies database migrations
// and creates the first staff account; elsewhere it does nothing.
import { execSync } from "node:child_process";

if (process.env.RENDER !== "true") process.exit(0);

const fail = (msg) => {
  console.error(`\n[render-prepare] ${msg}\n`);
  process.exit(1);
};

if (!process.env.DATABASE_URL) {
  fail("DATABASE_URL is not set. Create a PostgreSQL database and add its Internal Database URL to the service's Environment (see README → Deploy on Render).");
}
if (!process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET.length < 32) {
  fail("ADMIN_SESSION_SECRET is missing or shorter than 32 characters. Add it to the service's Environment (Render can generate one).");
}

console.log("[render-prepare] Applying database migrations…");
execSync("npx prisma migrate deploy", { stdio: "inherit" });

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (email && password) {
  if (password.length < 12) fail("ADMIN_PASSWORD must be at least 12 characters.");
  const { PrismaClient } = await import("@prisma/client");
  const bcrypt = (await import("bcryptjs")).default;
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (existing) {
      console.log(`[render-prepare] Staff account ${email} already exists — left unchanged.`);
    } else {
      await prisma.adminUser.create({
        data: { email, name: process.env.ADMIN_NAME?.trim() || email, passwordHash: await bcrypt.hash(password, 12) },
      });
      console.log(`[render-prepare] Created staff account ${email}.`);
    }
  } finally {
    await prisma.$disconnect();
  }
} else {
  console.log("[render-prepare] ADMIN_EMAIL / ADMIN_PASSWORD not set — no staff account created.");
}
