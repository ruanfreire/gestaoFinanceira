import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { AppWrapper } from "@ui/components/common/PageMeta";
import { ThemeProvider } from "@ui/context/ThemeContext";
import { AuthProvider } from "@/features/auth/context/AuthContext";
import { ToastProvider } from "@ui/components/ui/toast/ToastContext";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <AppWrapper>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </AppWrapper>
  );
}
