import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button, Typography } from "@/design-system/atoms";
import { Card, CardBody } from "@/design-system/organisms/card/card";

export type AttentionItem = {
  id: string;
  title: string;
  message: string;
  link: string;
  linkLabel: string;
  type?: "warning" | "info" | "error";
};

export function AttentionPanel({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) return null;

  const border = { warning: "border-l-warning", info: "border-l-info", error: "border-l-danger" };

  return (
    <section aria-label="Precisa da sua atenção" className="stack-gap">
      <Typography variant="overline">Precisa da sua atenção</Typography>
      <div className="stack-gap gap-3">
        {items.map((item) => (
          <Card key={item.id} className={`border-l-4 ${border[item.type ?? "warning"]}`}>
            <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Typography variant="subtitle">{item.title}</Typography>
                <Typography variant="body" tone="muted">
                  {item.message}
                </Typography>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to={item.link}>
                  {item.linkLabel}
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                </Link>
              </Button>
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  );
}
