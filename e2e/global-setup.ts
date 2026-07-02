import { execSync } from "node:child_process";
import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/finance_e2e";

export default async function globalSetup() {
  await mongoose.connect(MONGO_URI);
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();

  execSync("node backend/dist/common/seeder.js", {
    stdio: "inherit",
    env: {
      ...process.env,
      MONGO_URI,
      SEED_ADMIN_PASSWORD: "e2e-test-pass",
    },
  });
}
