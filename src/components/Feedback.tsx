export function Loading({ label = "Cargando" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-muted text-sm py-8">
      <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
      <span>{label}…</span>
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="border border-danger/40 bg-danger/10 text-danger px-4 py-3 rounded flex items-center justify-between gap-4 text-sm">
      <span>
        <span className="font-mono">✕</span> {message}
      </span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 border border-danger/50 px-3 py-1 rounded hover:bg-danger/20 transition-colors"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="border border-dashed border-border rounded px-4 py-10 text-center text-muted text-sm">
      {label}
    </div>
  );
}

export function StatusBadge({ status }: { status?: string }) {
  const normalized = (status ?? "").toLowerCase();
  const tone =
    normalized.includes("error") || normalized.includes("fail")
      ? "text-danger border-danger/40 bg-danger/10"
      : normalized.includes("complete") || normalized.includes("success") || normalized.includes("ready")
      ? "text-success border-success/40 bg-success/10"
      : normalized.includes("progress") || normalized.includes("pending") || normalized.includes("queue")
      ? "text-warning border-warning/40 bg-warning/10"
      : "text-muted border-border bg-surface-alt";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border ${tone}`}>
      {status ?? "—"}
    </span>
  );
}

export function JsonPreview({ data }: { data: unknown }) {
  return (
    <pre className="text-xs font-mono bg-surface-alt border border-border rounded p-4 overflow-auto scrollbar-thin max-h-[480px] text-ink">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
