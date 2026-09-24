import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { Loading } from "../components/Feedback";
import PendingQueuePanel from "../components/PendingQueuePanel";
import { flowApi } from "../api/client";
import type { FlowDefinition, PendingJobItem } from "../api/types";

/**
 * Always-visible home for the CSV-loaded "trabajos pendientes" queue —
 * unlike the same panel embedded in NewJob.tsx (reached only after picking
 * a flow there), this is its own nav destination so an OPERATIONAL user can
 * check/manage pending records without starting a new job first. Picking a
 * row here hands off to NewJob.tsx to actually run the guided capture.
 */
export default function PendingJobs() {
  const navigate = useNavigate();
  const [grantedFlows, setGrantedFlows] = useState<FlowDefinition[] | undefined>(undefined);
  const [selectedFlow, setSelectedFlow] = useState<FlowDefinition | null>(null);

  useEffect(() => {
    flowApi
      .granted()
      .then((flows) => {
        setGrantedFlows(flows);
        if (flows.length === 1) setSelectedFlow(flows[0]);
      })
      .catch(() => setGrantedFlows([]));
  }, []);

  function handleProcess(item: PendingJobItem) {
    if (!selectedFlow) return;
    navigate("/nuevo-trabajo", { state: { flow: selectedFlow, item } });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Cola de impresión"
        title="Trabajos pendientes"
        description="Registros cargados por CSV, listos para procesarse o para que la persona se autoatienda en el kiosco."
      />

      {grantedFlows === undefined && (
        <div className="stub p-6">
          <Loading label="Cargando tus flujos" />
        </div>
      )}

      {grantedFlows && grantedFlows.length === 0 && (
        <div className="stub p-6">
          <p className="text-muted text-sm">
            Todavía no tienes ningún flujo habilitado. Pide a un administrador que te dé acceso a uno desde
            "Usuarios".
          </p>
        </div>
      )}

      {grantedFlows && grantedFlows.length > 0 && (
        <div className="stub p-6">
          {grantedFlows.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-5 pb-5 border-b border-border">
              {grantedFlows.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFlow(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    selectedFlow?.id === f.id
                      ? "border-brand/50 bg-brand/10 text-brand font-medium"
                      : "border-border text-muted hover:border-brand/40"
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          )}

          {selectedFlow && <PendingQueuePanel flow={selectedFlow} onProcess={handleProcess} />}
        </div>
      )}
    </div>
  );
}
