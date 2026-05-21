import type { ReactNode } from "react";
import {
  ADMIN_BLOCKED_NAV_TITLE,
  adminBlockedNavClass,
} from "../lib/adminShopNav";

type Props = {
  children: ReactNode;
  className?: string;
  as?: "span" | "div";
  "aria-label"?: string;
};

export function AdminBlockedNav({
  children,
  className = "",
  as = "span",
  "aria-label": ariaLabel,
}: Props) {
  const Tag = as;
  return (
    <Tag
      className={`${adminBlockedNavClass} ${className}`.trim()}
      aria-disabled="true"
      aria-label={ariaLabel}
      title={ADMIN_BLOCKED_NAV_TITLE}
    >
      {children}
    </Tag>
  );
}
