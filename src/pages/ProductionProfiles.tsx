import { useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { EmptyState, ErrorBanner, Loading } from "../components/Feedback";
import { useAsync } from "../hooks/useAsync";
import { productionProfileApi } from "../api/client";

export default function ProductionProfiles() {
  const { data: profiles, loading, error, reload } = useAsync(() => productionProfileApi.list(), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div>
      <PageHeader
        eyebrow="Plantillas"
        title="Perfiles de producción"
        description="Cada perfil define los parámetros necesarios para producir una tarjeta (foto, datos, plantilla)."
      />

      {loading && <Loading label="Cargando perfiles" />}
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {!loading && !error && (!profiles || profiles.length === 0) && (
        <EmptyState label="No se encontraron perfiles de producción." />
      )}

      {!loading && !error && profiles && profiles.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.3fr] gap-6 items-start">
          <div className="stub overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Perfil</th>
                  <th>Organización</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p, i) => {
                  const id = String(p.profileId ?? i);
                  const isSelected = selectedId === id;
                  return (
                    <tr
                      key={id}
                      onClick={() => setSelectedId(isSelected ? null : id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? "bg-brand/10" : "hover:bg-surface-alt"
                      }`}
                    >
                      <td>
                        <p className="font-medium text-ink">{p.name ?? "(sin nombre)"}</p>
                        <p className="text-muted text-xs font-mono">{p.profileId ?? "—"}</p>
                      </td>
                      <td className="text-muted text-xs">{p.organizationName ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="stub p-5 lg:sticky lg:top-6">
            {selectedId ? (
              <ProfileDetail profileId={selectedId} />
            ) : (
              <p className="text-muted text-sm">Selecciona un perfil para ver sus parámetros.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileDetail({ profileId }: { profileId: string }) {
  const { data, loading, error, reload } = useAsync(
    () => productionProfileApi.parameters(profileId),
    [profileId],
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-brand text-xs font-semibold uppercase tracking-wide">Parámetros configurables</p>
        <Link
          to={`/nuevo-trabajo?profileId=${encodeURIComponent(profileId)}`}
          className="text-xs bg-brand text-white font-medium px-3 py-1.5 rounded-lg hover:bg-brand-dim transition-colors"
        >
          Usar en nuevo trabajo →
        </Link>
      </div>

      {loading && <Loading label="Cargando parámetros" />}
      {error && <ErrorBanner message={error} onRetry={reload} />}

      {data?.profileParameters && data.profileParameters.length > 0 ? (
        <div className="border border-border rounded-lg overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Parámetro</th>
                <th>Tipo</th>
                <th>Requerido</th>
                <th>Default / opciones</th>
              </tr>
            </thead>
            <tbody>
              {data.profileParameters.map((param, i) => (
                <tr key={i}>
                  <td className="font-medium text-ink">{param.name ?? `parámetro ${i + 1}`}</td>
                  <td className="text-teal text-xs font-mono">{param.dataType ?? "Text"}</td>
                  <td className="text-xs">
                    {param.required ? (
                      <span className="text-brand">requerido</span>
                    ) : (
                      <span className="text-muted">opcional</span>
                    )}
                  </td>
                  <td className="text-muted text-xs">
                    {param.options && param.options.length > 0
                      ? param.options.join(", ")
                      : param.defaultValue ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !loading && !error && <p className="text-muted text-sm">Este perfil no requiere parámetros.</p>
      )}
    </div>
  );
}
