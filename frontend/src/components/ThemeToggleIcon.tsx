import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";
import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "../store/themeStore";

type Props = {
  size?: number;
  strokeWidth?: number;
  className?: string;
};

export function themeToggleAriaLabel(dark: boolean) {
  return dark ? "Светлая тема" : "Тёмная тема";
}

export default function ThemeToggleIcon({
  size = 24,
  strokeWidth = 1.5,
  className = "",
}: Props) {
  const dark = useThemeStore((s) => s.dark);
  const skipSwapAnim = useRef(true);

  useEffect(() => {
    skipSwapAnim.current = false;
  }, []);

  const Icon = dark ? Sun : Moon;

  return (
    <span
      className={`ns-theme-icon ${className}`.trim()}
      style={{ "--ns-theme-icon-size": `${size}px` } as CSSProperties}
      aria-hidden
    >
      <Icon
        key={dark ? "sun" : "moon"}
        size={size}
        strokeWidth={strokeWidth}
        className={skipSwapAnim.current ? undefined : "ns-theme-icon__swap"}
      />
    </span>
  );
}
