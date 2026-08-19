import { useState } from "react";
import PageHeader from "../components/PageHeader";
import { EmptyState, ErrorBanner, Loading, StatusBadge } from "../components/Feedback";
import { useAsync } from "../hooks/useAsync";
import { deviceApi } from "../api/client";

type Tab = "devices" | "destinations";

export default function Devices() {
  const [tab, setTab] = useState<Tab>("devices");
  const [orgFilter, setOrgFilter] = useState("");

  return (
    <div>
      <PageHeader
        eyebrow="Infraestructura"
        title="Dispositivos"
        description="Impresoras y destinos de impresión disponibles para la producción de tarjetas."
        action={
          <div className="flex gap-2">
            <TabButton active={tab === "devices"} onClick={() => setTab("devices")}>
              Impresoras
            </TabButton>
            <TabButton active={tab === "destinations"} onClick={() => setTab("destinations")}>
              Destinos de impresión
            </TabButton>
          </div>
        }
      />

      <div className="mb-5 flex items-center gap-2">
        <input
          value={orgFilter}
          onChange={(e) => setOrgFilter(e.target.value)}
          placeholder="Filtrar por ID de organización (opcional)"
          className="input w-full sm:w-80"
        />
      </div>

      {tab === "devices" ? <DeviceList orgFilter={orgFilter} /> : <DestinationList orgFilter={orgFilter} />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
        active ? "border-brand/40 bg-brand/10 text-brand font-medium" : "border-border text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function DeviceList({ orgFilter }: { orgFilter: string }) {
  const { data, loading, error, reload } = useAsync(
    () => (orgFilter ? deviceApi.listByOrganization(orgFilter) : deviceApi.list()),
    [orgFilter],
  );

  if (loading) return <Loading label="Cargando dispositivos" />;
  if (error) return <ErrorBanner message={error} onRetry={reload} />;
  if (!data || data.length === 0) return <EmptyState label="No se encontraron dispositivos." />;

  return (
    <div className="stub overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Dispositivo</th>
            <th>ID</th>
            <th>Estado</th>
            <th>Modelo</th>
            <th>Ubicación</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={d.deviceUniqueId ?? i}>
              <td className="font-medium text-ink">{d.deviceName ?? "(sin nombre)"}</td>
              <td className="text-muted text-xs font-mono">{d.deviceUniqueId}</td>
              <td>
                <StatusBadge status={d.deviceStatus} />
              </td>
              <td className="text-muted text-xs">{d.deviceModel ?? "—"}</td>
              <td className="text-muted text-xs">{d.locationName ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DestinationList({ orgFilter }: { orgFilter: string }) {
  const { data, loading, error, reload } = useAsync(
    () =>
      orgFilter ? deviceApi.printDestinationsByOrganization(orgFilter) : deviceApi.printDestinations(),
    [orgFilter],
  );

  if (loading) return <Loading label="Cargando destinos de impresión" />;
  if (error) return <ErrorBanner message={error} onRetry={reload} />;
  if (!data || data.length === 0) return <EmptyState label="No se encontraron destinos de impresión." />;

  return (
    <div className="stub overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Impresora</th>
            <th>Destino</th>
            <th>Ubicación</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={d.destination ?? i}>
              <td className="font-medium text-ink">{d.printerName ?? "(sin nombre)"}</td>
              <td className="text-muted text-xs font-mono">{d.destination}</td>
              <td className="text-muted text-xs">{d.locationName ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
