import { QueryClient } from "@tanstack/react-query";

export function shouldRetryQuery(failureCount: number, error: unknown) {
  const status = (error as { response?: { status?: number } })?.response
    ?.status;
  if (status === 429 || status === 401 || status === 403) return false;
  return failureCount < 1;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: shouldRetryQuery,
      refetchOnWindowFocus: false,
    },
  },
});
