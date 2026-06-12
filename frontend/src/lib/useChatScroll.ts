import { useCallback, useEffect, useRef } from "react";

export function useChatScroll(messageCount: number, roomKey?: number | string | null) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialScrollDoneRef = useRef<string | number | null>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  const afterOwnMessage = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToBottom(true));
    });
  }, [scrollToBottom]);

  useEffect(() => {
    if (roomKey == null) return;
    if (initialScrollDoneRef.current === roomKey) return;
    if (messageCount === 0) return;
    initialScrollDoneRef.current = roomKey;
    requestAnimationFrame(() => scrollToBottom(false));
  }, [roomKey, messageCount, scrollToBottom]);

  return {
    scrollRef,
    afterOwnMessage,
  };
}
