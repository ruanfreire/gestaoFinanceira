import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Typography } from "@/design-system/atoms";
import { cn } from "@/design-system/lib/cn";

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-2xl border border-border bg-surface p-6 shadow-lg",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          )}
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" aria-hidden />
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <DialogPrimitive.Title asChild>
                <Typography variant="title">{title}</Typography>
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description asChild>
                  <Typography variant="body" tone="muted" className="mt-1">
                    {description}
                  </Typography>
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Fechar">
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
