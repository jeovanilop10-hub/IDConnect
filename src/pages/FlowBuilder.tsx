import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import { ErrorBanner, Loading } from "../components/Feedback";
import ProfileParameterField from "../components/ProfileParameterField";
import { useAsync } from "../hooks/useAsync";
import { flowApi, productionProfileApi, deviceApi } from "../api/client";
import type { FlowDefinition, FlowStep, FlowStepType, PrintDestination, ProductionProfileParameter } from "../api/types";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";

interface AvailableField {
  name: string;
  dataType: string;
}

const STEP_TYPE_LABELS: Record<FlowStepType, string> = {
  INFO: "Información",
  PHOTO: "Foto",
  FIELDS: "Campos",
};

type Stage = 1 | 2 | 3 | 4 | 5 | 6;

const STAGE_LABELS: Record<Stage, string> = {
  1: "Perfil",
  2: "Configuración",
  3: "Destino",
  4: "Campos",
  5: "Pasos",
  6: "Publicar",
};

function newStep(type: FlowStepType = "INFO"): FlowStep {
  return {
    id: crypto.randomUUID(),
    type,
    title: "",
    instructions: "",
    parameterNames: [],
  };
}

export default function FlowBuilder() {
  const { data: profiles, loading: loadingProfiles, error: profilesError } = useAsync(
    () => productionProfileApi.list(),
    [],
  );

  const [profileId, setProfileId] = useState("");
  const [stage, setStage] = useState<Stage>(1);

  // All flows already defined for the selected profile — a profile can
  // have more than one (e.g. "Solicitud express" vs "Solicitud completa"),
  // and the CLIENT picks which one to use at runtime.
  const [flows, setFlows] = useState<FlowDefinition[] | null>(null);
  const [loadingFlows, setLoadingFlows] = useState(false);
  const [flowsError, setFlowsError] = useState<string | null>(null);

  // The flow currently being edited. undefined id = new, unsaved flow.
  const [editingId, setEditingId] = useState<number | undefined>(undefined);
  const [flowName, setFlowName] = useState("");
  const [steps, setSteps] = useState<FlowStep[]>([]);
  const [availableFields, setAvailableFields] = useState<AvailableField[] | null>(null);
  const [loadingFields, setLoadingFields] = useState(false);
  const [fieldsError, setFieldsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // The profile's own config parameters (e.g. CardType) — the admin
  // resolves these once per flow so the end CLIENT never sees them.
  const [profileParams, setProfileParams] = useState<ProductionProfileParameter[] | null>(null);
  const [loadingProfileParams, setLoadingProfileParams] = useState(false);
  const [profileParamValues, setProfileParamValues] = useState<Record<string, string>>({});
  const [requestNameField, setRequestNameField] = useState("");
  const [destination, setDestination] = useState("");
  const [destinations, setDestinations] = useState<PrintDestination[] | null>(null);
  const [loadingDestinations, setLoadingDestinations] = useState(false);
  const [publicEnabled, setPublicEnabled] = useState(false);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);
  const DEFAULT_PRIMARY = "#2E4A46";
  const DEFAULT_BG = "#F2F6F5";
  const [themePrimaryColor, setThemePrimaryColor] = useState(DEFAULT_PRIMARY);
  const [themeBackgroundColor, setThemeBackgroundColor] = useState(DEFAULT_BG);
  const [themeLogoText, setThemeLogoText] = useState("");

  function resetEditor() {
    setEditingId(undefined);
    setFlowName("");
    setSteps([]);
    setProfileParamValues({});
    setRequestNameField("");
    setDestination("");
    setPublicEnabled(false);
    setSavedSlug(null);
    setThemePrimaryColor(DEFAULT_PRIMARY);
    setThemeBackgroundColor(DEFAULT_BG);
    setThemeLogoText("");
    setAvailableFields(null);
    setSaved(false);
    setSaveError(null);
  }

  function loadFlows(pid: string) {
    setLoadingFlows(true);
    setFlowsError(null);
    flowApi
      .listByProfile(pid)
      .then(setFlows)
      .catch((err) => setFlowsError(err?.message ?? "No se pudieron cargar los flujos de este perfil."))
      .finally(() => setLoadingFlows(false));
  }

  // Whenever the selected profile changes: load its own flows, its config
  // parameters and available print destinations, and reset the editor to a
  // blank new flow.
  useEffect(() => {
    resetEditor();
    if (!profileId) {
      setFlows(null);
      setProfileParams(null);
      setDestinations(null);
      return;
    }

    loadFlows(profileId);

    setLoadingProfileParams(true);
    productionProfileApi
      .parameters(profileId)
      .then((config) => setProfileParams(config.profileParameters ?? []))
      .catch(() => setProfileParams([]))
      .finally(() => setLoadingProfileParams(false));

    const selectedProfile = (profiles ?? []).find((p) => p.profileId === profileId);
    setLoadingDestinations(true);
    (selectedProfile?.organizationId
      ? deviceApi.printDestinationsByOrganization(selectedProfile.organizationId)
      : deviceApi.printDestinations()
    )
      .then(setDestinations)
      .catch(() => setDestinations([]))
      .finally(() => setLoadingDestinations(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  function editFlow(flow: FlowDefinition) {
    setEditingId(flow.id);
    setFlowName(flow.name);
    setSteps(flow.steps);
    setProfileParamValues(flow.profileParameterValues ?? {});
    setRequestNameField(flow.requestNameField ?? "");
    setDestination(flow.destination ?? "");
    setPublicEnabled(flow.publicEnabled ?? false);
    setSavedSlug(flow.publicSlug ?? null);
    setThemePrimaryColor(flow.theme?.primaryColor || DEFAULT_PRIMARY);
    setThemeBackgroundColor(flow.theme?.backgroundColor || DEFAULT_BG);
    setThemeLogoText(flow.theme?.logoText ?? "");
    setAvailableFields(null);
    setSaved(false);
    setSaveError(null);
  }

  async function handleDelete(flow: FlowDefinition) {
    if (!flow.id) return;
    setDeletingId(flow.id);
    try {
      await flowApi.remove(flow.id);
      if (editingId === flow.id) resetEditor();
      loadFlows(profileId);
    } catch (err: any) {
      setFlowsError(err?.message ?? "No se pudo eliminar el flujo.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleLoadFields() {
    setFieldsError(null);
    setLoadingFields(true);
    try {
      const profileParameters = (profileParams ?? []).map((p) => ({
        ...p,
        value: profileParamValues[p.name ?? ""] ?? p.defaultValue ?? "",
      }));
      const template = await productionProfileApi.configure({ profileId, profileParameters });
      const fields: AvailableField[] = [];
      for (const service of template.services ?? []) {
        for (const param of service.parameters ?? []) {
          const name = param.parameter?.name;
          const dataType = param.dataType ?? param.parameter?.dataType ?? "Text";
          if (name) fields.push({ name, dataType });
        }
      }
      setAvailableFields(fields);
    } catch (err: any) {
      setFieldsError(err?.message ?? "No se pudieron cargar los parámetros de este perfil.");
    } finally {
      setLoadingFields(false);
    }
  }

  function addStep(type: FlowStepType) {
    setSteps((prev) => [...prev, newStep(type)]);
  }

  function updateStep(id: string, patch: Partial<FlowStep>) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function removeStep(id: string) {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }

  function moveStep(index: number, direction: -1 | 1) {
    setSteps((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSave() {
    setSaveError(null);
    setSaving(true);
    setSaved(false);
    try {
      const result = await flowApi.save({
        id: editingId,
        profileId,
        name: flowName || "Flujo sin nombre",
        steps,
        profileParameterValues: profileParamValues,
        requestNameField: requestNameField || null,
        destination: destination || null,
        publicEnabled,
        theme: {
          primaryColor: themePrimaryColor,
          backgroundColor: themeBackgroundColor,
          logoText: themeLogoText || null,
        },
      });
      setEditingId(result.id);
      setSavedSlug(result.publicSlug ?? null);
      setSaved(true);
      loadFlows(profileId);
    } catch (err: any) {
      setSaveError(err?.message ?? "No se pudo guardar el flujo.");
    } finally {
      setSaving(false);
    }
  }

  const imageFields = (availableFields ?? []).filter((f) => f.dataType === "Image");
  const nonImageFields = (availableFields ?? []).filter((f) => f.dataType !== "Image");

  const stages: Stage[] = [1, 2, 3, 4, 5, 6];

  return (
    <div>
      <PageHeader
        eyebrow="Administración"
        title="Constructor de flujos"
        description="Define los pasos que un cliente ve al enviar una solicitud. Un mismo perfil puede tener varios flujos — el cliente elige cuál usar."
      />

      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 mb-6">
        {stages.map((s, i) => (
          <div key={s} className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => (s === 1 || profileId) && setStage(s)}
              disabled={s !== 1 && !profileId}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                s === stage
                  ? "bg-brand text-white font-medium"
                  : s !== 1 && !profileId
                  ? "text-muted/50 border border-border cursor-not-allowed"
                  : "text-brand border border-brand/40 hover:bg-brand/10"
              }`}
            >
              <span className="font-mono text-xs">{s}</span>
              <span className="hidden sm:inline">{STAGE_LABELS[s]}</span>
            </button>
            {i < stages.length - 1 && <span className="text-border">—</span>}
          </div>
        ))}
      </div>

      {stage === 1 && (
        <div className="stub p-5 space-y-4">
          <p className="text-brand text-xs font-semibold uppercase tracking-wide">Elige un perfil</p>
          {loadingProfiles && <Loading label="Cargando perfiles" />}
          {profilesError && <ErrorBanner message={profilesError} />}
          {profiles && (
            <select
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              className="input w-full max-w-md"
            >
              <option value="">(selecciona un perfil de producción)</option>
              {profiles.map((p, i) => (
                <option key={p.profileId ?? i} value={p.profileId ?? ""}>
                  {p.name ?? p.profileId}
                </option>
              ))}
            </select>
          )}

          {profileId && (
            <div className="pt-3 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-brand text-xs font-semibold uppercase tracking-wide">Flujos de este perfil</p>
                <button
                  onClick={resetEditor}
                  className="flex items-center gap-1.5 text-xs bg-brand text-white font-medium px-3 py-1.5 rounded-lg hover:bg-brand-dim transition-colors"
                >
                  <Plus size={13} />
                  Nuevo flujo
                </button>
              </div>
              {loadingFlows && <Loading label="Cargando flujos" />}
              {flowsError && <ErrorBanner message={flowsError} onRetry={() => loadFlows(profileId)} />}
              {flows && flows.length === 0 && (
                <p className="text-muted text-sm">
                  Este perfil todavía no tiene ningún flujo — sigue adelante para crear el primero.
                </p>
              )}
              {flows && flows.length > 0 && (
                <ul className="space-y-2">
                  {flows.map((flow) => (
                    <li
                      key={flow.id}
                      className={`flex items-center justify-between border rounded-lg px-3 py-2 transition-colors ${
                        editingId === flow.id ? "border-brand/50 bg-brand/10" : "border-border"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-ink">{flow.name}</p>
                        <p className="text-muted text-xs">
                          {flow.steps.length} paso(s)
                          {flow.publicEnabled && <span className="text-teal ml-2">· kiosco público</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => editFlow(flow)}
                          className="flex items-center gap-1 text-xs border border-border px-2.5 py-1.5 rounded-lg text-muted hover:text-brand hover:border-brand/40 transition-colors"
                        >
                          <Pencil size={12} />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(flow)}
                          disabled={deletingId === flow.id}
                          className="text-muted hover:text-danger transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <NextButton disabled={!profileId} onClick={() => setStage(2)} />
          </div>
        </div>
      )}

      {stage === 2 && (
        <div className="stub p-5 space-y-4">
          <p className="text-brand text-xs font-semibold uppercase tracking-wide">Configuración del perfil</p>
          <p className="text-muted text-sm">
            Estos son ajustes del perfil en sí (no datos del cliente) — los resuelves tú una vez por flujo, y el
            cliente final nunca los ve.
          </p>
          {loadingProfileParams && <Loading label="Cargando configuración del perfil" />}
          {profileParams && profileParams.length === 0 && (
            <p className="text-muted text-sm">Este perfil no requiere configuración adicional.</p>
          )}
          {profileParams && profileParams.length > 0 && (
            <div className="space-y-3 max-w-md">
              {profileParams.map((p, i) => (
                <ProfileParameterField
                  key={p.name ?? i}
                  parameter={p}
                  value={profileParamValues[p.name ?? ""] ?? p.defaultValue ?? ""}
                  onChange={(v) => setProfileParamValues((prev) => ({ ...prev, [p.name ?? String(i)]: v }))}
                />
              ))}
            </div>
          )}
          <div className="flex justify-between pt-2">
            <BackButton onClick={() => setStage(1)} />
            <NextButton onClick={() => setStage(3)} />
          </div>
        </div>
      )}

      {stage === 3 && (
        <div className="stub p-5 space-y-4">
          <p className="text-brand text-xs font-semibold uppercase tracking-wide">Destino de impresión</p>
          <p className="text-muted text-sm">
            Elige a qué impresora se envía este flujo — el cliente final no elige esto, ya queda fijo aquí.
          </p>
          {loadingDestinations && <Loading label="Cargando destinos de impresión" />}
          {destinations && destinations.length === 0 && (
            <p className="text-muted text-sm">No se encontraron destinos de impresión para este perfil.</p>
          )}
          {destinations && destinations.length > 0 && (
            <select value={destination} onChange={(e) => setDestination(e.target.value)} className="input w-full max-w-md">
              <option value="">(selecciona un destino)</option>
              {destinations.map((d, i) => (
                <option key={d.destination ?? i} value={d.destination ?? ""}>
                  {d.printerName ?? d.destination} {d.locationName ? `— ${d.locationName}` : ""}
                </option>
              ))}
            </select>
          )}
          <div className="flex justify-between pt-2">
            <BackButton onClick={() => setStage(2)} />
            <NextButton onClick={() => setStage(4)} />
          </div>
        </div>
      )}

      {stage === 4 && (
        <div className="stub p-5 space-y-4">
          <p className="text-brand text-xs font-semibold uppercase tracking-wide">Campos disponibles</p>
          <p className="text-muted text-sm">
            Carga los parámetros reales que este perfil pide (nombre, foto, ID, etc.) para poder asignarlos a los
            pasos del flujo.
          </p>
          <button
            onClick={handleLoadFields}
            disabled={loadingFields}
            className="text-sm bg-brand text-white font-medium px-4 py-2 rounded-lg hover:bg-brand-dim transition-colors disabled:opacity-50"
          >
            {loadingFields ? "Cargando…" : "Cargar parámetros del perfil"}
          </button>
          {fieldsError && <ErrorBanner message={fieldsError} />}
          {availableFields && (
            <div className="flex flex-wrap gap-2 pt-2">
              {availableFields.length === 0 && (
                <p className="text-muted text-sm">Este perfil no tiene parámetros de solicitud.</p>
              )}
              {availableFields.map((f) => (
                <span key={f.name} className="text-xs border border-border rounded-lg px-2 py-1 text-muted font-mono">
                  {f.name} <span className="text-teal">· {f.dataType}</span>
                </span>
              ))}
            </div>
          )}

          {availableFields && availableFields.length > 0 && (
            <div className="pt-2 border-t border-border mt-2">
              <label className="block max-w-md">
                <span className="block text-xs text-muted mb-1">
                  Campo que identifica la solicitud (número de nómina, SOEID, etc.)
                </span>
                <select
                  value={requestNameField}
                  onChange={(e) => setRequestNameField(e.target.value)}
                  className="input w-full"
                >
                  <option value="">(generar automáticamente)</option>
                  {availableFields
                    .filter((f) => f.dataType !== "Image")
                    .map((f) => (
                      <option key={f.name} value={f.name}>
                        {f.name}
                      </option>
                    ))}
                </select>
              </label>
              <p className="text-muted text-xs mt-1">
                El valor que el cliente capture en este campo se usará para identificar su solicitud ante HID
                Fargo Connect.
              </p>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <BackButton onClick={() => setStage(3)} />
            <NextButton onClick={() => setStage(5)} />
          </div>
        </div>
      )}

      {stage === 5 && (
        <div className="stub p-5 space-y-4">
          <p className="text-brand text-xs font-semibold uppercase tracking-wide">
            Pasos del flujo — {editingId ? "editando" : "nuevo"}
          </p>

          <label className="block max-w-md">
            <span className="block text-xs text-muted mb-1">Nombre del flujo</span>
            <input
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              placeholder="p. ej. Solicitud express (sin foto)"
              className="input w-full"
            />
          </label>

          <div className="space-y-3">
            {steps.map((step, index) => (
              <StepEditor
                key={step.id}
                step={step}
                index={index}
                total={steps.length}
                imageFields={imageFields}
                nonImageFields={nonImageFields}
                onChange={(patch) => updateStep(step.id, patch)}
                onRemove={() => removeStep(step.id)}
                onMove={(dir) => moveStep(index, dir)}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {(Object.keys(STEP_TYPE_LABELS) as FlowStepType[]).map((type) => (
              <button
                key={type}
                onClick={() => addStep(type)}
                className="flex items-center gap-1.5 text-xs border border-border px-3 py-1.5 rounded-lg text-muted hover:text-brand hover:border-brand/40 transition-colors"
              >
                <Plus size={13} />
                Paso de {STEP_TYPE_LABELS[type].toLowerCase()}
              </button>
            ))}
          </div>

          <div className="flex justify-between pt-2">
            <BackButton onClick={() => setStage(4)} />
            <NextButton disabled={steps.length === 0} onClick={() => setStage(6)} />
          </div>
        </div>
      )}

      {stage === 6 && (
        <div className="stub p-5 space-y-4">
          <p className="text-brand text-xs font-semibold uppercase tracking-wide">Apariencia y publicación</p>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={publicEnabled}
              onChange={(e) => setPublicEnabled(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-ink">Habilitar como kiosco público (sin inicio de sesión)</span>
          </label>
          <p className="text-muted text-xs -mt-2">
            Genera un enlace independiente que cualquiera puede abrir para enviar una solicitud con este flujo —
            útil para una tablet o kiosco compartido. No requiere cuenta.
          </p>
          {publicEnabled && savedSlug && (
            <div className="flex flex-wrap items-center gap-2">
              <code className="text-xs bg-surface-alt border border-border rounded px-2 py-1 text-ink break-all">
                {`${window.location.origin}/captura/${savedSlug}`}
              </code>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/captura/${savedSlug}`)}
                className="text-xs text-brand hover:underline shrink-0"
              >
                Copiar
              </button>
            </div>
          )}
          {publicEnabled && !savedSlug && <p className="text-muted text-xs">El enlace se genera al guardar.</p>}

          {publicEnabled && (
            <div className="pt-4 border-t border-border">
              <p className="text-sm font-medium text-ink mb-1">Apariencia del kiosco</p>
              <p className="text-muted text-xs mb-3">
                Estos colores solo se aplican en la pantalla pública de este flujo — el resto de la app no cambia.
              </p>
              <div className="flex flex-wrap gap-6">
                <label className="block">
                  <span className="block text-xs text-muted mb-1">Color principal (botones, acentos)</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={themePrimaryColor}
                      onChange={(e) => setThemePrimaryColor(e.target.value)}
                      className="w-9 h-9 rounded border border-border cursor-pointer"
                    />
                    <span className="text-xs font-mono text-muted">{themePrimaryColor}</span>
                  </div>
                </label>
                <label className="block">
                  <span className="block text-xs text-muted mb-1">Color de fondo</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={themeBackgroundColor}
                      onChange={(e) => setThemeBackgroundColor(e.target.value)}
                      className="w-9 h-9 rounded border border-border cursor-pointer"
                    />
                    <span className="text-xs font-mono text-muted">{themeBackgroundColor}</span>
                  </div>
                </label>
              </div>
              <label className="block max-w-xs mt-3">
                <span className="block text-xs text-muted mb-1">Nombre mostrado en el kiosco (opcional)</span>
                <input
                  value={themeLogoText}
                  onChange={(e) => setThemeLogoText(e.target.value)}
                  placeholder="ID Connect"
                  className="input w-full"
                />
              </label>
            </div>
          )}

          {saveError && <ErrorBanner message={saveError} />}
          {saved && <p className="text-success text-sm">✓ Flujo guardado correctamente.</p>}

          <div className="flex justify-between items-center pt-2">
            <BackButton onClick={() => setStage(5)} />
            <div className="flex items-center gap-3">
              {editingId && (
                <button onClick={resetEditor} className="text-xs text-muted hover:text-ink transition-colors">
                  Cancelar edición / empezar uno nuevo
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving || steps.length === 0}
                className="bg-brand text-white font-medium px-5 py-2 rounded-lg hover:bg-brand-dim transition-colors text-sm disabled:opacity-50"
              >
                {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Crear flujo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NextButton({ disabled, onClick }: { disabled?: boolean; onClick: () => void }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="bg-brand text-white font-medium px-4 py-2 rounded-lg hover:bg-brand-dim transition-colors text-sm disabled:opacity-50"
    >
      Siguiente →
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="border border-border px-4 py-2 rounded-lg text-sm text-muted hover:text-ink transition-colors"
    >
      ← Atrás
    </button>
  );
}

function StepEditor({
  step,
  index,
  total,
  imageFields,
  nonImageFields,
  onChange,
  onRemove,
  onMove,
}: {
  step: FlowStep;
  index: number;
  total: number;
  imageFields: AvailableField[];
  nonImageFields: AvailableField[];
  onChange: (patch: Partial<FlowStep>) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <div className="border border-border rounded-lg p-4 bg-surface-alt">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <GripVertical size={14} className="text-muted" />
          <span className="text-xs font-mono text-muted">Paso {index + 1}</span>
          <select
            value={step.type}
            onChange={(e) => onChange({ type: e.target.value as FlowStepType, parameterNames: [] })}
            className="input text-xs py-1"
          >
            {(Object.keys(STEP_TYPE_LABELS) as FlowStepType[]).map((type) => (
              <option key={type} value={type}>
                {STEP_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="text-muted hover:text-ink disabled:opacity-30 text-xs px-1.5"
          >
            ↑
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="text-muted hover:text-ink disabled:opacity-30 text-xs px-1.5"
          >
            ↓
          </button>
          <button onClick={onRemove} className="text-muted hover:text-danger transition-colors ml-1">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <input
          value={step.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Título del paso (lo que ve el cliente)"
          className="input w-full"
        />
        <textarea
          value={step.instructions ?? ""}
          onChange={(e) => onChange({ instructions: e.target.value })}
          placeholder="Instrucciones para el cliente (opcional)"
          rows={2}
          className="input w-full resize-none"
        />

        {step.type === "FIELDS" && (
          <div>
            <p className="text-xs text-muted mb-1">Campos a capturar en este paso:</p>
            {nonImageFields.length === 0 ? (
              <p className="text-xs text-muted">Carga los parámetros del perfil arriba para poder elegir.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {nonImageFields.map((f) => {
                  const checked = (step.parameterNames ?? []).includes(f.name);
                  return (
                    <label
                      key={f.name}
                      className={`text-xs px-2 py-1 rounded-lg border cursor-pointer transition-colors ${
                        checked ? "border-brand/50 bg-brand/10 text-brand" : "border-border text-muted"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const current = step.parameterNames ?? [];
                          onChange({
                            parameterNames: e.target.checked
                              ? [...current, f.name]
                              : current.filter((n) => n !== f.name),
                          });
                        }}
                        className="hidden"
                      />
                      {f.name}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {step.type === "PHOTO" && (
          <div>
            <p className="text-xs text-muted mb-1">Parámetro de imagen que esta foto va a llenar:</p>
            {imageFields.length === 0 ? (
              <p className="text-xs text-muted">
                Carga los parámetros del perfil arriba — no se encontró ningún campo de tipo imagen.
              </p>
            ) : (
              <select
                value={step.parameterNames?.[0] ?? ""}
                onChange={(e) => onChange({ parameterNames: e.target.value ? [e.target.value] : [] })}
                className="input w-full max-w-xs"
              >
                <option value="">(selecciona)</option>
                {imageFields.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
