import { useEffect } from "react";

export function useBodyScrollLock(locked: boolean, className?: string) {
  useEffect(() => {
    if (!locked) return;

    const scrollY = window.scrollY;
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    const bodyPosition = document.body.style.position;
    const bodyTop = document.body.style.top;
    const bodyWidth = document.body.style.width;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    const classes = className?.split(/\s+/).filter(Boolean) ?? [];
    classes.forEach((c) => document.body.classList.add(c));

    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
      document.body.style.position = bodyPosition;
      document.body.style.top = bodyTop;
      document.body.style.width = bodyWidth;
      classes.forEach((c) => document.body.classList.remove(c));
      window.scrollTo(0, scrollY);
    };
  }, [locked, className]);
}
