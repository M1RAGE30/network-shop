import { PrismaMariaDb } from "@prisma/adapter-mariadb";

export function createMysqlAdapter(connectionString?: string) {
  const dbUrl = new URL(
    connectionString ||
      process.env.DATABASE_URL ||
      "mysql://root:root@localhost:3306/network_shop",
  );
  const ssl =
    dbUrl.searchParams.get("sslaccept") === "strict"
      ? { rejectUnauthorized: true }
      : undefined;

  return new PrismaMariaDb({
    host: dbUrl.hostname,
    port: dbUrl.port ? parseInt(dbUrl.port, 10) : 3306,
    user: decodeURIComponent(dbUrl.username),
    password: decodeURIComponent(dbUrl.password),
    database: dbUrl.pathname.slice(1),
    ssl,
    allowPublicKeyRetrieval: true,
    connectionLimit: Number(process.env.DB_POOL_SIZE) || 10,
  });
}
