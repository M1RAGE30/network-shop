import "dotenv/config";
import { PrismaClient } from "../../generated/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const dbUrl = new URL(
  process.env.DATABASE_URL || "mysql://root:root@localhost:3306/network_shop",
);
const ssl =
  dbUrl.searchParams.get("sslaccept") === "strict"
    ? { rejectUnauthorized: true }
    : undefined;

const adapter = new PrismaMariaDb({
  host: dbUrl.hostname,
  port: dbUrl.port ? parseInt(dbUrl.port) : 3306,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  ssl,
  allowPublicKeyRetrieval: true,
});

const prisma = new PrismaClient({ adapter });
export default prisma;
