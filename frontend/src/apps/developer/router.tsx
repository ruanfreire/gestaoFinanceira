import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppProviders } from "@/app/providers";
import { PageTitleSync } from "@/app/page-title-sync";
import { RequireSuperadmin } from "@/features/auth/require-auth";
import { Typography } from "@/design-system/atoms";
import { Card, CardBody, CardHeader } from "@/design-system/organisms";
import { Key, Webhook, FileCode, Plug, FlaskConical, Radio, Gauge } from "lucide-react";

const PLACEHOLDER_SECTIONS = [
  { icon: Key, title: "API Keys", description: "Chaves de acesso para integrações" },
  { icon: Webhook, title: "Webhooks", description: "Eventos em tempo real" },
  { icon: FileCode, title: "Schemas & OpenAPI", description: "Contratos da API" },
  { icon: Plug, title: "Connectors", description: "Conectores de desenvolvimento" },
  { icon: FlaskConical, title: "Sandbox ingest", description: "Testar ingestão sem dados reais" },
  { icon: Radio, title: "Event stream", description: "Monitor de eventos" },
  { icon: Gauge, title: "Rate limits", description: "Limites por chave" },
];

function DeveloperHomePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <Typography variant="title">Developer Console</Typography>
        <Typography variant="body" tone="muted" className="mt-1">
          Ferramentas técnicas para engenharia e parceiros API.
        </Typography>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {PLACEHOLDER_SECTIONS.map(({ icon: Icon, title, description }) => (
          <Card key={title}>
            <CardHeader title={title} />
            <CardBody className="flex gap-3">
              <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              <Typography variant="caption" tone="muted">
                {description}
              </Typography>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function DeveloperRouter() {
  return (
    <AppProviders>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PageTitleSync />
        <Routes>
          <Route
            path="/"
            element={
              <RequireSuperadmin>
                <DeveloperHomePage />
              </RequireSuperadmin>
            }
          />
        </Routes>
      </BrowserRouter>
    </AppProviders>
  );
}
