import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import { ReactElement, ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@ui/context/ThemeContext";
import { AppWrapper } from "@ui/components/common/PageMeta";
import { ToastProvider } from "@ui/components/ui/toast/ToastContext";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

type AppRenderOptions = RenderOptions & {
  route?: string;
};

export function renderWithProviders(ui: ReactElement, options: AppRenderOptions = {}) {
  const { route = "/", ...renderOptions } = options;
  const queryClient = createTestQueryClient();

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AppWrapper>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
            </ToastProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </AppWrapper>
    );
  }

  return {
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}
