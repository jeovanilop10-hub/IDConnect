import { useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { EmptyState, ErrorBanner, Loading, StatusBadge } from "../components/Feedback";
import { useAsync } from "../hooks/useAsync";
import { jobApi } from "../api/client";
import { formatLocalDateTime } from "../lib/date";

const DURATION_PRESETS = [
  { label: "Última hora", value: "PT1H" },
  { label: "Últimas 24 horas", value: "PT24H" },
  { label: "Últimos 7 días", value: "P7D" },
  { label: "Últimos 30 días", value: "P30D" },
];

export default function Jobs() {
  const [mode, setMode] = useState<"time-period" | "date-range">("time-period");
  const [maxResults, setMaxResults] = useState(25);
  const [duration, setDuration] = useState("PT24H");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [jumpId, setJumpId] = useState("");

  const {
    data: jobs,
    loading,
    error,
    reload,
  } = useAsync(() => {
    if (mode === "time-period") {
      return jobApi.forTimePeriod(maxResults, duration);
    }
    return jobApi.forDateRange(maxResults, startDate, endDate);
  }, [mode, maxResults, duration, startDate, endDate]);

  return (
    <div>
      <PageHeader
        eyebrow="Historial"
        title="Trabajos de impresión"
        description="Consulta trabajos por periodo relativo o por rango de fechas exacto."
        action={
          <Link
            to="/nuevo-trabajo"
            className="bg-brand text-white font-medium px-4 py-2 rounded hover:bg-brand-dim transition-colors text-sm"
          >
            + Nuevo trabajo
          </Link>
        }
      />

      <div className="stub p-4 mb-6 space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setMode("time-period")}
            className={`px-3 py-1.5 rounded text-sm border ${
              mode === "time-period" ? "border-brand/50 bg-brand/10 text-brand" : "border-border text-muted"
            }`}
          >
            Periodo relativo
          </button>
          <button
            onClick={() => setMode("date-range")}
            className={`px-3 py-1.5 rounded text-sm border ${
              mode === "date-range" ? "border-brand/50 bg-brand/10 text-brand" : "border-border text-muted"
            }`}
          >
            Rango de fechas
          </button>
        </div>

        <div className="flex items-end gap-3 flex-wrap">
          <Field label="Máx. resultados">
            <input
              type="number"
              min={1}
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value) || 1)}
              className="input w-24"
            />
          </Field>

          {mode === "time-period" ? (
            <Field label="Duración">
              <select value={duration} onChange={(e) => setDuration(e.target.value)} className="input w-48">
                {DURATION_PRESETS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <>
              <Field label="Desde (ISO 8601)">
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input w-56"
                />
              </Field>
              <Field label="Hasta (ISO 8601)">
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input w-56"
                />
              </Field>
            </>
          )}

          <button
            onClick={reload}
            className="border border-border px-4 py-2 rounded text-sm hover:border-brand/50 transition-colors"
          >
            Buscar
          </button>
        </div>

        <div className="flex items-end gap-3 flex-wrap pt-3 border-t border-border">
          <Field label="Ir directo a un trabajo por ID">
            <input
              value={jumpId}
              onChange={(e) => setJumpId(e.target.value)}
              placeholder="job unique id"
              className="input w-full sm:w-64"
            />
          </Field>
          <Link
            to={jumpId ? `/trabajos/${encodeURIComponent(jumpId)}` : "#"}
            className={`px-4 py-2 rounded text-sm border ${
              jumpId
                ? "border-teal/50 text-teal hover:bg-teal/10"
                : "border-border text-muted pointer-events-none opacity-50"
            }`}
          >
            Ver detalle →
          </Link>
        </div>
      </div>

      {loading && <Loading label="Buscando trabajos" />}
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {!loading && !error && (!jobs || jobs.length === 0) && (
        <EmptyState label="No se encontraron trabajos para estos criterios." />
      )}

      {!loading && !error && jobs && jobs.length > 0 && (
        <div className="stub overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID de trabajo</th>
                <th>Nombre</th>
                <th>Enviado</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j, i) => (
                <tr key={j.jobUniqueId ?? i} className="hover:bg-surface-alt transition-colors">
                  <td className="font-mono text-xs text-ink">{j.jobUniqueId ?? "(sin id)"}</td>
                  <td className="text-ink text-sm">{j.jobName ?? "(sin nombre)"}</td>
                  <td className="text-muted text-xs">{formatLocalDateTime(j.submitDate)}</td>
                  <td>
                    <StatusBadge status={j.jobStatus} />
                  </td>
                  <td className="text-right">
                    <Link
                      to={`/trabajos/${encodeURIComponent(j.jobUniqueId ?? "")}`}
                      className="text-brand text-xs font-medium hover:underline"
                    >
                      Ver detalle →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-muted">
      <span className="block mb-1">{label}</span>
      {children}
    </label>
  );
}
