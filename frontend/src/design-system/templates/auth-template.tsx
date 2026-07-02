import { Typography } from "@/design-system/atoms";
import { SkipToContent, ThemeToggle } from "@/design-system/molecules";
import { Card, CardBody } from "@/design-system/organisms";

export function AuthTemplate({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <SkipToContent />
      <div className="mb-8 flex items-center gap-3">
        <img src="/images/logo/logo-icon.svg" alt="" className="h-10 w-10" aria-hidden />
        <Typography variant="h2">Gestão Financeira</Typography>
      </div>
      <Card id="main-content" tabIndex={-1} className="w-full max-w-md">
        <CardBody>
          <Typography variant="h3" as="h1">
            {title}
          </Typography>
          {description && (
            <Typography variant="body" tone="muted" className="mt-1">
              {description}
            </Typography>
          )}
          <div className="mt-6">{children}</div>
        </CardBody>
      </Card>
    </div>
  );
}
