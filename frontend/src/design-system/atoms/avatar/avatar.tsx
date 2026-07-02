import { cn } from "@/design-system/lib/cn";

export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name?: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const initials = name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sizeClass = { sm: "h-8 w-8 text-caption", md: "h-10 w-10 text-small", lg: "h-12 w-12 text-body" }[size];

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-subtle font-medium text-primary",
        sizeClass,
        className,
      )}
      aria-hidden={!name}
      title={name}
    >
      {src ? <img src={src} alt={name ?? ""} className="h-full w-full object-cover" /> : initials ?? "?"}
    </div>
  );
}
