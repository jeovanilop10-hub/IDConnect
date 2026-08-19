import { useState } from "react";
import PageHeader from "../components/PageHeader";
import { EmptyState, ErrorBanner, Loading } from "../components/Feedback";
import { useAsync } from "../hooks/useAsync";
import { flowApi } from "../api/client";
import { Check, Copy } from "lucide-react";

export default function PublicKiosks() {
  const { data: flows, loading, error, reload } = useAsync(() => flowApi.listPublic(), []);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  function urlFor(slug: string) {
    return `${window.location.origin}/captura/${slug}`;
  }

  async function handleCopy(id: number, slug: string) {
    await navigator.clipboard.writeText(urlFor(slug));
    setCopiedId(id);
    setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 2000);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Administración"
        title="Captura pública"
        description="Enlaces sin necesidad de iniciar sesión — útiles para un kiosco o tablet compartida. Habilítalos desde el constructor de flujos."
      />

      {loading && <Loading label="Cargando enlaces públicos" />}
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {!loading && !error && (!flows || flows.length === 0) && (
        <EmptyState label="No hay ningún flujo habilitado como kiosco público todavía. Ve al constructor de flujos y activa la opción 'Habilitar como kiosco público' en el que quieras compartir." />
      )}

      {flows && flows.length > 0 && (
        <ul className="space-y-2">
          {flows.map(
            (flow) =>
              flow.id &&
              flow.publicSlug && (
                <li key={flow.id} className="stub p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{flow.name}</p>
                    <p className="text-muted text-xs font-mono truncate">{urlFor(flow.publicSlug)}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(flow.id!, flow.publicSlug!)}
                    className="flex items-center gap-1.5 text-xs border border-border px-3 py-1.5 rounded-lg text-muted hover:text-brand hover:border-brand/40 transition-colors shrink-0"
                  >
                    {copiedId === flow.id ? (
                      <>
                        <Check size={13} />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        Copiar enlace
                      </>
                    )}
                  </button>
                </li>
              ),
          )}
        </ul>
      )}
    </div>
  );
}
