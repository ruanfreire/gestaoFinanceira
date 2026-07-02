import { Typography } from "@/design-system/atoms";

export function SkipToContent({ targetId = "main-content" }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:shadow-lg"
    >
      <Typography variant="small" className="font-medium text-primary-foreground">
        Pular para o conteúdo
      </Typography>
    </a>
  );
}
