import { useState } from "react";
import PageHeader from "../components/PageHeader";
import { EmptyState, ErrorBanner, Loading } from "../components/Feedback";
import { useAsync } from "../hooks/useAsync";
import { organizationApi } from "../api/client";
import type { Location, OrganizationalUnit } from "../api/types";

export default function Organizations() {
  const { data: organizations, loading, error, reload } = useAsync(() => organizationApi.list(), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div>
      <PageHeader
        eyebrow="Directorio"
        title="Organizaciones"
        description="Selecciona una organización para ver sus unidades organizacionales y ubicaciones."
      />

      {loading && <Loading label="Cargando organizaciones" />}
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {!loading && !error && (!organizations || organizations.length === 0) && (
        <EmptyState label="No se encontraron organizaciones." />
      )}

      {!loading && !error && organizations && organizations.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.3fr] gap-6 items-start">
          <div className="stub overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Organización</th>
                  <th>ID</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org, i) => {
                  const id = String(org.organizationId ?? i);
                  const isSelected = selectedId === id;
                  return (
                    <tr
                      key={id}
                      onClick={() => setSelectedId(isSelected ? null : id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? "bg-brand/10" : "hover:bg-surface-alt"
                      }`}
                    >
                      <td className="font-medium text-ink">{org.name ?? "(sin nombre)"}</td>
                      <td className="text-muted text-xs font-mono">{org.organizationId ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="stub p-5 lg:sticky lg:top-6">
            {selectedId ? (
              <OrganizationDetail organizationId={selectedId} />
            ) : (
              <p className="text-muted text-sm">Selecciona una organización de la lista para ver el detalle.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OrganizationDetail({ organizationId }: { organizationId: string }) {
  const {
    data: units,
    loading: loadingUnits,
    error: unitsError,
  } = useAsync(() => organizationApi.units(organizationId), [organizationId]);

  const {
    data: locations,
    loading: loadingLocations,
    error: locationsError,
  } = useAsync(() => organizationApi.locations(organizationId), [organizationId]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-brand text-xs font-semibold uppercase tracking-wide mb-2">Unidades organizacionales</p>
        {loadingUnits && <Loading label="Cargando unidades" />}
        {unitsError && <ErrorBanner message={unitsError} />}
        {!loadingUnits && !unitsError && (!units || units.length === 0) && (
          <p className="text-muted text-sm">Sin unidades registradas.</p>
        )}
        {units && units.length > 0 && (
          <div className="border border-border rounded-lg overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>ID</th>
                </tr>
              </thead>
              <tbody>
                {units.map((u: OrganizationalUnit, i) => (
                  <tr key={u.organizationUnitId ?? i}>
                    <td className="font-medium text-ink">{u.name ?? "(sin nombre)"}</td>
                    <td className="text-muted text-xs font-mono">{u.organizationUnitId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <p className="text-brand text-xs font-semibold uppercase tracking-wide mb-2">Ubicaciones</p>
        {loadingLocations && <Loading label="Cargando ubicaciones" />}
        {locationsError && <ErrorBanner message={locationsError} />}
        {!loadingLocations && !locationsError && (!locations || locations.length === 0) && (
          <p className="text-muted text-sm">Sin ubicaciones registradas.</p>
        )}
        {locations && locations.length > 0 && (
          <div className="border border-border rounded-lg overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ubicación</th>
                  <th>Unidad</th>
                  <th>Ciudad</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((l: Location, i) => (
                  <tr key={l.locationId ?? i}>
                    <td className="font-medium text-ink">{l.locationName ?? "(sin nombre)"}</td>
                    <td className="text-muted text-xs">{l.organizationalUnitName ?? "—"}</td>
                    <td className="text-muted text-xs">
                      {l.businessAddress?.city
                        ? `${l.businessAddress.city}${l.businessAddress.state ? `, ${l.businessAddress.state}` : ""}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
