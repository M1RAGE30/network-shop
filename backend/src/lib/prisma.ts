import "dotenv/config";
import { PrismaClient } from "../../generated/client";
import { createMariaAdapter } from "./db-adapter";

const prisma = new PrismaClient({ adapter: createMariaAdapter() });

export default prisma;
