import { Fragment, useState } from "react";
import PageHeader from "../components/PageHeader";
import { ErrorBanner, Loading } from "../components/Feedback";
import { useAsync } from "../hooks/useAsync";
import { flowApi, userApi } from "../api/client";
import type { Role } from "../api/types";

const ROLES: Role[] = ["ADMIN", "OPERATOR", "CLIENT", "OPERATIONAL"];

export default function Users() {
  const { data: users, loading, error, reload } = useAsync(() => userApi.list(), []);
  // Only fetched/used for the OPERATIONAL flow checklists (create form + per-user edit).
  const { data: allFlows } = useAsync(() => flowApi.list(), []);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("OPERATOR");
  const [organizationId, setOrganizationId] = useState("");
  const [flowIds, setFlowIds] = useState<number[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingFlowsUserId, setEditingFlowsUserId] = useState<number | null>(null);
  const [editingFlowIds, setEditingFlowIds] = useState<number[]>([]);
  const [savingFlows, setSavingFlows] = useState(false);
  const [flowsError, setFlowsError] = useState<string | null>(null);

  function toggleFlowId(ids: number[], setIds: (ids: number[]) => void, id: number) {
    setIds(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  }

  async function handleCreate() {
    setCreateError(null);
    setCreating(true);
    try {
      await userApi.create({
        username,
        password,
        role,
        organizationId: role === "CLIENT" ? organizationId : undefined,
        flowIds: role === "OPERATIONAL" ? flowIds : undefined,
      });
      setUsername("");
      setPassword("");
      setOrganizationId("");
      setFlowIds([]);
      reload();
    } catch (err: any) {
      setCreateError(err?.message ?? "No se pudo crear el usuario");
    } finally {
      setCreating(false);
    }
  }

  async function handleDisable(id: number) {
    await userApi.disable(id);
    reload();
  }

  function startEditingFlows(userId: number, currentFlowIds: number[] | undefined) {
    setEditingFlowsUserId(userId);
    setEditingFlowIds(currentFlowIds ?? []);
    setFlowsError(null);
  }

  async function handleSaveFlows() {
    if (editingFlowsUserId == null) return;
    setFlowsError(null);
    setSavingFlows(true);
    try {
      await userApi.setFlowGrants(editingFlowsUserId, editingFlowIds);
      setEditingFlowsUserId(null);
      reload();
    } catch (err: any) {
      setFlowsError(err?.message ?? "No se pudieron guardar los flujos.");
    } finally {
      setSavingFlows(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Administración"
        title="Usuarios del portal"
        description="Crea cuentas para operadores internos o para organizaciones cliente."
      />

      <div className="stub p-5 mb-8 space-y-4">
        <p className="text-brand text-xs font-semibold uppercase tracking-wide">Nueva cuenta</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs text-muted mb-1">Usuario</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} className="input w-full" />
          </label>
          <label className="block">
            <span className="block text-xs text-muted mb-1">Contraseña (mín. 8 caracteres)</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input w-full"
            />
          </label>
          <label className="block">
            <span className="block text-xs text-muted mb-1">Rol</span>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="input w-full">
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          {role === "CLIENT" && (
            <label className="block">
              <span className="block text-xs text-muted mb-1">ID de organización</span>
              <input
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                placeholder="debe existir en ID Issuance"
                className="input w-full"
              />
            </label>
          )}
        </div>

        {role === "OPERATIONAL" && (
          <div>
            <span className="block text-xs text-muted mb-2">
              Flujos que puede ver y usar este usuario (sin ninguno marcado, no verá nada)
            </span>
            <FlowChecklist flows={allFlows} selected={flowIds} onToggle={(id) => toggleFlowId(flowIds, setFlowIds, id)} />
          </div>
        )}

        {createError && <ErrorBanner message={createError} />}
        <button
          onClick={handleCreate}
          disabled={creating || !username || password.length < 8 || (role === "CLIENT" && !organizationId)}
          className="bg-brand text-white font-medium px-4 py-2 rounded hover:bg-brand-dim transition-colors text-sm disabled:opacity-50"
        >
          {creating ? "Creando…" : "Crear cuenta"}
        </button>
      </div>

      {loading && <Loading label="Cargando usuarios" />}
      {error && <ErrorBanner message={error} onRetry={reload} />}

      {users && users.length > 0 && (
        <div className="stub overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Organización</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <Fragment key={u.id}>
                  <tr>
                    <td className="font-medium text-ink">{u.username}</td>
                    <td>
                      <span className="text-teal text-xs font-mono border border-teal/30 rounded px-1.5 py-0.5">
                        {u.role}
                      </span>
                    </td>
                    <td className="text-muted text-xs font-mono">{u.organizationId ?? "—"}</td>
                    <td>
                      {u.enabled ? (
                        <span className="text-success text-xs">Activo</span>
                      ) : (
                        <span className="text-danger text-xs">Deshabilitado</span>
                      )}
                    </td>
                    <td className="text-right space-x-2 whitespace-nowrap">
                      {u.role === "OPERATIONAL" && (
                        <button
                          onClick={() => startEditingFlows(u.id, u.flowIds)}
                          className="text-xs border border-border px-3 py-1.5 rounded text-muted hover:text-brand hover:border-brand/40 transition-colors"
                        >
                          {(u.flowIds?.length ?? 0)} flujo(s) — editar
                        </button>
                      )}
                      {u.enabled && (
                        <button
                          onClick={() => handleDisable(u.id)}
                          className="text-xs border border-border px-3 py-1.5 rounded text-muted hover:text-danger hover:border-danger/40 transition-colors"
                        >
                          Deshabilitar
                        </button>
                      )}
                    </td>
                  </tr>
                  {editingFlowsUserId === u.id && (
                    <tr key={`${u.id}-flows`}>
                      <td colSpan={5} className="bg-surface-alt/50">
                        <div className="p-4 space-y-3">
                          <p className="text-xs font-medium text-ink">Flujos habilitados para {u.username}</p>
                          <FlowChecklist
                            flows={allFlows}
                            selected={editingFlowIds}
                            onToggle={(id) => toggleFlowId(editingFlowIds, setEditingFlowIds, id)}
                          />
                          {flowsError && <ErrorBanner message={flowsError} />}
                          <div className="flex items-center gap-3">
                            <button
                              onClick={handleSaveFlows}
                              disabled={savingFlows}
                              className="bg-brand text-white font-medium px-4 py-1.5 rounded text-xs hover:bg-brand-dim transition-colors disabled:opacity-50"
                            >
                              {savingFlows ? "Guardando…" : "Guardar"}
                            </button>
                            <button
                              onClick={() => setEditingFlowsUserId(null)}
                              className="text-xs text-muted hover:text-ink transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FlowChecklist({
  flows,
  selected,
  onToggle,
}: {
  flows: { id?: number; name: string }[] | null | undefined;
  selected: number[];
  onToggle: (id: number) => void;
}) {
  if (!flows) return <Loading label="Cargando flujos" />;
  if (flows.length === 0) return <p className="text-muted text-xs">No hay flujos creados todavía.</p>;
  return (
    <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
      {flows.map((f) =>
        f.id == null ? null : (
          <label key={f.id} className="flex items-center gap-2 text-sm px-1 py-0.5 cursor-pointer">
            <input type="checkbox" checked={selected.includes(f.id)} onChange={() => onToggle(f.id!)} className="w-4 h-4" />
            {f.name}
          </label>
        ),
      )}
    </div>
  );
}
