/**
 * Creates or resets an administrator account (there is no public registration).
 *
 *   npm run admin:create -- --email staff@mtc.edu.om --name "Staff Name"
 *
 * The password is read from the ADMIN_PASSWORD environment variable or prompted for.
 * Add --deactivate to disable an account.
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { createInterface } from "node:readline/promises";

const args = process.argv.slice(2);
const arg = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+$/.test(email)) throw new Error("--email is required");
  const prisma = new PrismaClient();
  try {
    if (args.includes("--deactivate")) {
      await prisma.adminUser.update({ where: { email }, data: { active: false } });
      console.log(`Deactivated ${email}`);
      return;
    }
    let password = process.env.ADMIN_PASSWORD;
    if (!password) {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      password = await rl.question("Password (min 12 characters): ");
      rl.close();
    }
    if (password.length < 12) throw new Error("Password must be at least 12 characters");
    const passwordHash = await bcrypt.hash(password, 12);
    const name = arg("name") ?? email;
    await prisma.adminUser.upsert({
      where: { email },
      create: { email, name, passwordHash, roles: ["ADMIN"] },
      update: { passwordHash, active: true, mustChangePassword: false, ...(arg("name") ? { name } : {}) },
    });
    console.log(`Administrator ${email} is ready.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
