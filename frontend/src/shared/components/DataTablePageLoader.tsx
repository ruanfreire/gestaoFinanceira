import Spinner from "@ui/components/ui/spinner/Spinner";

export function PageLoader({ label = "Carregando página..." }: { label?: string }) {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner size="lg" label={label} />
    </div>
  );
}
