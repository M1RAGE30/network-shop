import type { User } from "../store/authStore";

export const isAdmin = (user: User | null | undefined) =>
  user?.role === "ADMIN";

export const isCustomer = (user: User | null | undefined) =>
  !!user && user.role !== "ADMIN";
