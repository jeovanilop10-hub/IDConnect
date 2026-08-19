import { useState } from "react";
import PageHeader from "../components/PageHeader";
import { ErrorBanner, Loading } from "../components/Feedback";
import { useAsync } from "../hooks/useAsync";
import { userApi } from "../api/client";
import type { Role } from "../api/types";

const ROLES: Role[] = ["ADMIN", "OPERATOR", "CLIENT"];

export default function Users() {
  const { data: users, loading, error, reload } = useAsync(() => userApi.list(), []);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("OPERATOR");
  const [organizationId, setOrganizationId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleCreate() {
    setCreateError(null);
    setCreating(true);
    try {
      await userApi.create({
        username,
        password,
        role,
        organizationId: role === "CLIENT" ? organizationId : undefined,
      });
      setUsername("");
      setPassword("");
      setOrganizationId("");
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
                placeholder="debe existir en Fargo Connect"
                className="input w-full"
              />
            </label>
          )}
        </div>
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
                <tr key={u.id}>
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
                  <td className="text-right">
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
