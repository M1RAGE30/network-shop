import { Link } from "react-router-dom";
import type { ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variantClass: Record<Variant, string> = {
  primary: "ns-btn ns-btn-primary",
  secondary: "ns-btn ns-btn-secondary",
  ghost: "ns-btn ns-btn-ghost",
};

interface BaseProps {
  variant?: Variant;
  className?: string;
  children: ReactNode;
}

export function ButtonLink({
  to,
  variant = "primary",
  className = "",
  children,
}: BaseProps & { to: string }) {
  return (
    <Link to={to} className={`${variantClass[variant]} ${className}`}>
      {children}
    </Link>
  );
}
