import { useLocation, useNavigate, useParams } from "react-router-dom";
import { RotateCw } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { ErrorBanner, JsonPreview, Loading, StatusBadge } from "../components/Feedback";
import { useAsync } from "../hooks/useAsync";
import { ApiError, jobApi } from "../api/client";
import { formatLocalDateTime } from "../lib/date";
import { useState } from "react";

/** HID's imageType is a bare format name (e.g. "JPEG"); pass through anything that already looks like a MIME type. */
function imageMimeType(imageType?: string): string {
  if (!imageType) return "image/jpeg";
  return imageType.includes("/") ? imageType : `image/${imageType.toLowerCase()}`;
}

/**
 * Resend: submits the job's stored request again as a new job, allowed while
 * the original hasn't printed. HID can't cancel jobs, so a job still in the
 * queue ("Submitted") may print as well — that case asks for confirmation.
 */
function ResendPanel({ jobId, jobStatus }: { jobId: string; jobStatus?: string }) {
  const navigate = useNavigate();
  const { data: eligibility, loading, error } = useAsync(() => jobApi.resendEligibility(jobId), [jobId, jobStatus]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  async function handleResend() {
    if (!eligibility?.canResend) return;
    const warning = eligibility.mayPrintTwice
      ? "Este trabajo sigue en cola (Submitted) y HID no permite cancelarlo: si la impresora todavía lo procesa, " +
        "se imprimirían dos tarjetas.\n\n¿Reenviarlo de todos modos?"
      : "Se enviará de nuevo como un trabajo nuevo. ¿Continuar?";
    if (!window.confirm(warning)) return;

    setSending(true);
    setSendError(null);
    try {
      const newJobId = await jobApi.resend(jobId);
      navigate(`/trabajos/${encodeURIComponent(newJobId)}`, { state: { resentFrom: jobId } });
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : "No se pudo reenviar el trabajo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="stub p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="data-label mb-1">Reenviar</p>
        {loading && <p className="text-muted text-sm">Verificando si se puede reenviar…</p>}
        {error && <p className="text-danger text-sm">No se pudo verificar el reenvío: {error}</p>}
        {eligibility && (
          <p className="text-sm text-muted">
            {eligibility.canResend
              ? eligibility.mayPrintTwice
                ? "Disponible. El trabajo sigue en cola: confirma antes para evitar una doble impresión."
                : "Disponible: el trabajo no se ha impreso y se enviará de nuevo como un trabajo nuevo."
              : eligibility.reason}
          </p>
        )}
        {sendError && <p className="text-danger text-sm mt-2">{sendError}</p>}
      </div>
      <button
        onClick={handleResend}
        disabled={!eligibility?.canResend || sending}
        className="btn-primary gap-2 px-4 py-2 text-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RotateCw size={15} strokeWidth={2.25} />
        {sending ? "Reenviando…" : "Reenviar trabajo"}
      </button>
    </div>
  );
}

export default function JobDetail() {
  const { jobId = "" } = useParams();
  const location = useLocation() as { state?: { resentFrom?: string } };
  const resentFrom = location.state?.resentFrom;
  const { data: job, loading, error, reload } = useAsync(() => jobApi.get(jobId), [jobId]);
  const [resourceKey, setResourceKey] = useState("");

  const {
    data: resource,
    loading: loadingResource,
    error: resourceError,
    reload: reloadResource,
  } = useAsync(() => (resourceKey ? jobApi.imageResource(jobId, resourceKey) : Promise.resolve(null)), [
    jobId,
    resourceKey,
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Trabajo"
        title={jobId}
        description="Detalle del trabajo de impresión y sus recursos de imagen asociados."
      />

      {resentFrom && (
        <div className="border border-success/40 bg-success/5 text-success rounded-lg px-4 py-3 text-sm mb-6">
          Trabajo reenviado. Este es el nuevo trabajo; el original era <span className="font-mono">{resentFrom}</span>.
        </div>
      )}

      {loading && <Loading label="Cargando trabajo" />}
      {error && <ErrorBanner message={error} onRetry={reload} />}

      {job && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="field-box">
              <p className="field-label">ID de trabajo</p>
              <p className="field-value font-mono text-xs">{job.jobUniqueId ?? jobId}</p>
            </div>
            <div className="field-box">
              <p className="field-label">Nombre</p>
              <p className="field-value">{job.jobName ?? "—"}</p>
            </div>
            <div className="field-box">
              <p className="field-label">Enviado</p>
              <p className="field-value">{formatLocalDateTime(job.submitDate)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted text-xs">Estado:</span>
            <StatusBadge status={job.jobStatus} />
          </div>

          <ResendPanel jobId={job.jobUniqueId ?? jobId} jobStatus={job.jobStatus} />

          <div>
            <p className="text-brand text-xs font-semibold uppercase tracking-wide mb-2">Datos completos</p>
            <JsonPreview data={job} />
          </div>

          <div className="stub p-5">
            <p className="text-brand text-xs font-semibold uppercase tracking-wide mb-3">
              Recursos de imagen del trabajo
            </p>

            {(job.jobResources?.length ?? 0) > 0 ? (
              <div className="flex flex-wrap gap-2 mb-4">
                {job.jobResources!.map((r) => (
                  <button
                    key={r.resourceKey}
                    onClick={() => setResourceKey(r.resourceKey ?? "")}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      resourceKey === r.resourceKey
                        ? "border-brand bg-brand/10 text-brand font-medium"
                        : "border-border hover:border-brand/50"
                    }`}
                  >
                    {r.resourceKey}
                    {r.resourceType && <span className="text-muted ml-1.5">({r.resourceType})</span>}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-muted text-sm mb-4">Este trabajo no reporta recursos de imagen.</p>
            )}

            <div className="flex items-end gap-3">
              <label className="block text-xs text-muted flex-1">
                <span className="block mb-1">Resource key</span>
                <input
                  value={resourceKey}
                  onChange={(e) => setResourceKey(e.target.value)}
                  placeholder="p. ej. front-photo"
                  className="input w-full"
                />
              </label>
              <button
                onClick={reloadResource}
                className="border border-border px-4 py-2 rounded-full text-sm hover:border-brand/50 transition-colors"
              >
                Consultar
              </button>
            </div>

            {loadingResource && <Loading label="Cargando recurso" />}
            {resourceError && <ErrorBanner message={resourceError} />}
            {resource && (
              <div className="mt-4 space-y-3">
                {resource.imageData ? (
                  <img
                    src={`data:${imageMimeType(resource.imageType)};base64,${resource.imageData}`}
                    alt={resource.resourceKey ?? "Recurso de imagen"}
                    className="max-w-xs rounded-lg border border-border"
                  />
                ) : (
                  <p className="text-muted text-sm">
                    La respuesta no incluyó datos de imagen (`imageData`) para mostrar.
                  </p>
                )}
                <JsonPreview data={resource} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
