import { useParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { ErrorBanner, JsonPreview, Loading, StatusBadge } from "../components/Feedback";
import { useAsync } from "../hooks/useAsync";
import { jobApi } from "../api/client";
import { formatLocalDateTime } from "../lib/date";
import { useState } from "react";

/** HID's imageType is a bare format name (e.g. "JPEG"); pass through anything that already looks like a MIME type. */
function imageMimeType(imageType?: string): string {
  if (!imageType) return "image/jpeg";
  return imageType.includes("/") ? imageType : `image/${imageType.toLowerCase()}`;
}

export default function JobDetail() {
  const { jobId = "" } = useParams();
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
                className="border border-border px-4 py-2 rounded text-sm hover:border-brand/50 transition-colors"
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
