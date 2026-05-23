import "dotenv/config";
import { PrismaClient } from "../../generated/client";
import { createMysqlAdapter } from "./db-adapter";

const prisma = new PrismaClient({ adapter: createMysqlAdapter() });

export default prisma;
