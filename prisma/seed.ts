import { db } from "../src/lib/db";
import { seedDatabase } from "../src/lib/db/seed-data";

async function main() {
  console.log("Seeding database...");

  const result = await seedDatabase(db);

  if (result.status === "already_seeded") {
    console.log("\nDatabase already has an admin user — seed skipped (idempotent).\n");
    return;
  }

  console.log("\n================ SEED COMPLETE ================");
  console.log("Login credentials:");
  console.log(`  ADMIN   ${result.credentials.admin.email} / ${result.credentials.admin.password}`);
  for (const agent of result.credentials.agents) {
    console.log(`  BROKER  ${agent.email} / ${agent.password}`);
  }
  console.log("=================================================\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
