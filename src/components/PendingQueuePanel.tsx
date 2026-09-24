import { useEffect, useState } from "react";
import { ErrorBanner, Loading } from "./Feedback";
import { flowApi } from "../api/client";
import type { FlowDefinition, Page, PendingJobItem, PendingSummary } from "../api/types";

const PENDING_PAGE_SIZE = 25;

/**
 * The CSV-loaded "trabajos pendientes" queue for one flow — upload, search,
 * paginate, edit or delete a row, clear everything, or pick a row to work
 * through (handed off to the caller via onProcess: NewJob.tsx pre-fills the
 * guided form right there, PendingJobs.tsx navigates to /nuevo-trabajo).
 */
export default function PendingQueuePanel({
  flow,
  onProcess,
  onManualEntry,
  onBack,
  backLabel = "← Atrás",
}: {
  flow: FlowDefinition;
  onProcess: (item: PendingJobItem) => void;
  onManualEntry?: () => void;
  onBack?: () => void;
  backLabel?: string;
}) {
  const [pendingPage, setPendingPage] = useState<Page<PendingJobItem> | undefined>(undefined);
  const [summary, setSummary] = useState<PendingSummary | undefined>(undefined);
  const [pendingSearchInput, setPendingSearchInput] = useState("");
  const [uploadingPending, setUploadingPending] = useState(false);
  const [clearingPending, setClearingPending] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [editingPendingId, setEditingPendingId] = useState<number | null>(null);
  const [editPersonId, setEditPersonId] = useState("");
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [savingPendingEdit, setSavingPendingEdit] = useState(false);
  const [deletingPendingId, setDeletingPendingId] = useState<number | null>(null);

  function loadPendingPage(pageIndex: number, search: string) {
    if (!flow.id) return;
    flowApi
      .listPending(flow.id, pageIndex, PENDING_PAGE_SIZE, search || undefined)
      .then(setPendingPage)
      .catch(() =>
        setPendingPage({ content: [], totalElements: 0, totalPages: 0, number: 0, size: PENDING_PAGE_SIZE }),
      );
  }

  function loadSummary() {
    if (!flow.id) return;
    flowApi.pendingSummary(flow.id).then(setSummary).catch(() => setSummary(undefined));
  }

  useEffect(() => {
    setEditingPendingId(null);
    setPendingSearchInput("");
    setPendingError(null);
    loadPendingPage(0, "");
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow.id]);

  async function handleUploadPendingFile(file: File) {
    if (!flow.id) return;
    setPendingError(null);
    setUploadingPending(true);
    try {
      await flowApi.uploadPending(flow.id, file);
      loadPendingPage(0, pendingSearchInput);
      loadSummary();
    } catch (err: any) {
      setPendingError(err?.message ?? "No se pudo cargar el archivo.");
    } finally {
      setUploadingPending(false);
    }
  }

  async function handleClearAllPending() {
    if (!flow.id) return;
    setPendingError(null);
    setClearingPending(true);
    try {
      await flowApi.clearPending(flow.id);
      loadPendingPage(0, pendingSearchInput);
      loadSummary();
    } catch (err: any) {
      setPendingError(err?.message ?? "No se pudieron borrar los pendientes.");
    } finally {
      setClearingPending(false);
    }
  }

  function startEditingPending(item: PendingJobItem) {
    setEditingPendingId(item.id);
    setEditPersonId(item.personId ?? "");
    setEditValues(item.values);
    setPendingError(null);
  }

  async function handleSavePendingEdit() {
    if (!flow.id || editingPendingId == null) return;
    setPendingError(null);
    setSavingPendingEdit(true);
    try {
      await flowApi.updatePending(flow.id, editingPendingId, {
        personId: editPersonId.trim() || null,
        values: editValues,
      });
      setEditingPendingId(null);
      loadPendingPage(pendingPage?.number ?? 0, pendingSearchInput);
    } catch (err: any) {
      setPendingError(err?.message ?? "No se pudo guardar el registro.");
    } finally {
      setSavingPendingEdit(false);
    }
  }

  async function handleDeletePendingItem(itemId: number) {
    if (!flow.id) return;
    setPendingError(null);
    setDeletingPendingId(itemId);
    try {
      await flowApi.deletePending(flow.id, itemId);
      loadPendingPage(pendingPage?.number ?? 0, pendingSearchInput);
      loadSummary();
    } catch (err: any) {
      setPendingError(err?.message ?? "No se pudo eliminar el registro.");
    } finally {
      setDeletingPendingId(null);
    }
  }

  // First column is the identifier the person can later type at the kiosk
  // to self-serve this same row — same convention as the admin's "Datos
  // precargados" template, so both CSVs share a shape.
  function pendingTemplateColumns(): string[] {
    const paramColumns = Array.from(
      new Set(flow.steps.filter((s) => s.type === "FIELDS").flatMap((s) => s.parameterNames ?? [])),
    );
    return [flow.identifierLabel?.trim() || "Identificador", ...paramColumns];
  }

  function downloadPendingTemplate() {
    const headers = pendingTemplateColumns();
    const escapeCsv = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
    const csv = headers.map(escapeCsv).join(",") + "\r\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `plantilla-pendientes-${(flow.name || "flujo").replace(/\s+/g, "-")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <p className="text-brand text-xs font-semibold uppercase tracking-wide pt-1.5">Trabajos pendientes (CSV)</p>
          {onManualEntry && (
            <button
              onClick={onManualEntry}
              className="bg-brand text-white font-medium px-4 py-2 rounded hover:bg-brand-dim transition-colors text-sm shrink-0"
            >
              + Registrar manualmente
            </button>
          )}
        </div>
        <p className="text-muted text-xs mb-3">
          Carga un CSV con varios registros para este flujo — cada fila queda en esta lista, y al enviar el trabajo
          de una fila, desaparece de aquí. ¿No tienes datos precargados para esta persona? Usa "Registrar
          manualmente" arriba.
        </p>

        {summary && summary.total > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="border border-border rounded-lg px-3 py-2.5">
              <p className="text-muted text-[11px] uppercase tracking-wide mb-0.5">Cargados</p>
              <p className="text-ink text-lg font-display font-semibold">{summary.total}</p>
            </div>
            <div className="border border-success/30 bg-success/5 rounded-lg px-3 py-2.5">
              <p className="text-success text-[11px] uppercase tracking-wide mb-0.5">Atendidos</p>
              <p className="text-success text-lg font-display font-semibold">{summary.processed}</p>
            </div>
            <div className="border border-brand/30 bg-brand/5 rounded-lg px-3 py-2.5">
              <p className="text-brand text-[11px] uppercase tracking-wide mb-0.5">Pendientes</p>
              <p className="text-brand text-lg font-display font-semibold">{summary.pending}</p>
            </div>
          </div>
        )}
        {summary && summary.total > 0 && (
          <div className="w-full h-1.5 rounded-full bg-surface-alt overflow-hidden mb-4">
            <div
              className="h-full bg-success transition-all"
              style={{ width: `${Math.round((summary.processed / summary.total) * 100)}%` }}
            />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={uploadingPending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadPendingFile(file);
              e.target.value = "";
            }}
            className="text-xs"
          />
          <button type="button" onClick={downloadPendingTemplate} className="text-xs text-brand hover:underline">
            Descargar plantilla CSV
          </button>
          {(pendingPage?.totalElements ?? 0) > 0 && (
            <button
              type="button"
              onClick={handleClearAllPending}
              disabled={clearingPending}
              className="text-xs text-muted hover:text-danger transition-colors disabled:opacity-50"
            >
              {clearingPending ? "Borrando…" : "Borrar todos los pendientes"}
            </button>
          )}
        </div>
        <p className="text-muted text-xs mb-3">
          Columnas: <code className="font-mono">{pendingTemplateColumns().join(", ")}</code> — la primera es el
          identificador con el que la persona podrá autoservirse en el kiosco (si este flujo lo tiene habilitado).
        </p>
        {uploadingPending && <p className="text-muted text-xs mb-3">Procesando…</p>}
        {pendingError && (
          <div className="mb-3">
            <ErrorBanner message={pendingError} />
          </div>
        )}

        {(pendingPage?.totalElements ?? 0) > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <input
              value={pendingSearchInput}
              onChange={(e) => setPendingSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadPendingPage(0, pendingSearchInput)}
              placeholder="Buscar por identificador…"
              className="input flex-1 text-sm"
            />
            <button
              type="button"
              onClick={() => loadPendingPage(0, pendingSearchInput)}
              className="text-xs border border-border px-3 py-2 rounded hover:border-brand/50 transition-colors"
            >
              Buscar
            </button>
          </div>
        )}

        {pendingPage === undefined ? (
          <Loading label="Cargando pendientes" />
        ) : pendingPage.content.length === 0 ? (
          <p className="text-muted text-sm">
            {pendingSearchInput ? "Ningún registro coincide con esa búsqueda." : "No hay trabajos pendientes cargados para este flujo."}
          </p>
        ) : (
          <div className="space-y-2">
            {pendingPage.content.map((item) => {
              const summary = Object.values(item.values).filter(Boolean).join(" · ") || "(sin datos)";
              if (editingPendingId === item.id) {
                return (
                  <div key={item.id} className="border border-brand/40 rounded-lg p-3 space-y-2 bg-brand/5">
                    <label className="block">
                      <span className="block text-xs text-muted mb-1">Identificador</span>
                      <input
                        value={editPersonId}
                        onChange={(e) => setEditPersonId(e.target.value)}
                        className="input w-full text-sm"
                      />
                    </label>
                    {Object.keys(editValues).map((key) => (
                      <label key={key} className="block">
                        <span className="block text-xs text-muted mb-1">{key}</span>
                        <input
                          value={editValues[key]}
                          onChange={(e) => setEditValues((prev) => ({ ...prev, [key]: e.target.value }))}
                          className="input w-full text-sm"
                        />
                      </label>
                    ))}
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={handleSavePendingEdit}
                        disabled={savingPendingEdit}
                        className="bg-brand text-white font-medium px-4 py-1.5 rounded text-xs hover:bg-brand-dim transition-colors disabled:opacity-50"
                      >
                        {savingPendingEdit ? "Guardando…" : "Guardar"}
                      </button>
                      <button
                        onClick={() => setEditingPendingId(null)}
                        className="text-xs text-muted hover:text-ink transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg border border-border hover:border-brand/40 hover:bg-brand/5 transition-colors"
                >
                  <button onClick={() => onProcess(item)} className="flex-1 min-w-0 text-left">
                    {item.personId && <p className="text-muted text-xs font-mono">{item.personId}</p>}
                    <p className="text-ink text-sm truncate">{summary}</p>
                  </button>
                  <button
                    onClick={() => startEditingPending(item)}
                    className="text-xs text-muted hover:text-brand transition-colors shrink-0"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeletePendingItem(item.id)}
                    disabled={deletingPendingId === item.id}
                    className="text-xs text-muted hover:text-danger transition-colors shrink-0 disabled:opacity-50"
                  >
                    {deletingPendingId === item.id ? "…" : "Eliminar"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {pendingPage && pendingPage.totalPages > 1 && (
          <div className="flex items-center justify-between mt-3 text-xs text-muted">
            <button
              onClick={() => loadPendingPage(pendingPage.number - 1, pendingSearchInput)}
              disabled={pendingPage.number === 0}
              className="border border-border px-3 py-1.5 rounded hover:border-brand/50 transition-colors disabled:opacity-50"
            >
              ← Anterior
            </button>
            <span>
              Página {pendingPage.number + 1} de {pendingPage.totalPages} ({pendingPage.totalElements} en total)
            </span>
            <button
              onClick={() => loadPendingPage(pendingPage.number + 1, pendingSearchInput)}
              disabled={pendingPage.number + 1 >= pendingPage.totalPages}
              className="border border-border px-3 py-1.5 rounded hover:border-brand/50 transition-colors disabled:opacity-50"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>

      {onBack && (
        <div className="pt-2 border-t border-border">
          <button
            onClick={onBack}
            className="border border-border px-4 py-2 rounded text-sm text-muted hover:text-ink transition-colors"
          >
            {backLabel}
          </button>
        </div>
      )}
    </div>
  );
}
