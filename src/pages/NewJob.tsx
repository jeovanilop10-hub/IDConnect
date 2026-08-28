import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { ErrorBanner, JsonPreview, Loading } from "../components/Feedback";
import GuidedFlowRunner from "../components/GuidedFlowRunner";
import RequestParameterField from "../components/RequestParameterField";
import ProfileParameterField from "../components/ProfileParameterField";
import { useAsync } from "../hooks/useAsync";
import { deviceApi, organizationApi, productionProfileApi, jobApi, flowApi } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type {
  CardRequestServiceData,
  FlowDefinition,
  PendingJobItem,
  ProductionProfileParameter,
  ProductionRequestTemplate,
} from "../api/types";

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS: Record<Step, string> = {
  1: "Organización",
  2: "Perfil",
  3: "Parámetros",
  4: "Revisar y enviar",
};

export default function NewJob() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isClient = user?.role === "CLIENT";
  const isOperational = user?.role === "OPERATIONAL";

  // OPERATIONAL skips organization/profile entirely — it has neither an org
  // scope (like CLIENT) nor open access to every profile (like OPERATOR); it
  // only ever sees the specific flows an admin granted it (see /flows/granted).
  const [grantedFlows, setGrantedFlows] = useState<FlowDefinition[] | undefined>(undefined);
  const [selectedGrantedFlow, setSelectedGrantedFlow] = useState<FlowDefinition | null>(null);

  useEffect(() => {
    if (!isOperational) return;
    flowApi
      .granted()
      .then((flows) => {
        setGrantedFlows(flows);
        if (flows.length === 1) setSelectedGrantedFlow(flows[0]);
      })
      .catch(() => setGrantedFlows([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once a flow is picked, an OPERATIONAL user can work through a CSV-loaded
  // queue of pending jobs instead of retyping each one — click a row to
  // pre-fill the guided form with it, submit, and it's removed from the queue.
  const [pendingItems, setPendingItems] = useState<PendingJobItem[] | undefined>(undefined);
  const [activePending, setActivePending] = useState<PendingJobItem | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [uploadingPending, setUploadingPending] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedGrantedFlow?.id) return;
    setActivePending(null);
    setManualEntry(false);
    flowApi
      .listPending(selectedGrantedFlow.id)
      .then(setPendingItems)
      .catch(() => setPendingItems([]));
  }, [selectedGrantedFlow?.id]);

  async function handleUploadPendingFile(file: File) {
    if (!selectedGrantedFlow?.id) return;
    setPendingError(null);
    setUploadingPending(true);
    try {
      setPendingItems(await flowApi.uploadPending(selectedGrantedFlow.id, file));
    } catch (err: any) {
      setPendingError(err?.message ?? "No se pudo cargar el archivo.");
    } finally {
      setUploadingPending(false);
    }
  }

  function pendingTemplateColumns(): string[] {
    if (!selectedGrantedFlow) return [];
    return Array.from(
      new Set(selectedGrantedFlow.steps.filter((s) => s.type === "FIELDS").flatMap((s) => s.parameterNames ?? [])),
    );
  }

  function downloadPendingTemplate() {
    const headers = pendingTemplateColumns();
    const escapeCsv = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
    const csv = headers.map(escapeCsv).join(",") + "\r\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `plantilla-pendientes-${(selectedGrantedFlow?.name || "flujo").replace(/\s+/g, "-")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const [step, setStep] = useState<Step>(isClient ? 2 : 1);
  const [organizationId, setOrganizationId] = useState(isClient ? user?.organizationId ?? "" : "");
  const [profileId, setProfileId] = useState(params.get("profileId") ?? "");
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [template, setTemplate] = useState<ProductionRequestTemplate | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);
  const [availableFlows, setAvailableFlows] = useState<FlowDefinition[] | null | undefined>(undefined);
  const [selectedFlow, setSelectedFlow] = useState<FlowDefinition | null>(null);

  // Whenever a profile is chosen, check whether an admin has defined any
  // guided flows for it. undefined = still checking, null/[] = none exist.
  useEffect(() => {
    setSelectedFlow(null);
    if (!profileId) {
      setAvailableFlows(undefined);
      return;
    }
    setAvailableFlows(undefined);
    flowApi
      .listByProfile(profileId)
      .then((flows) => {
        setAvailableFlows(flows);
        if (flows.length === 1) setSelectedFlow(flows[0]);
      })
      .catch(() => setAvailableFlows([]));
  }, [profileId]);

  // If arriving with a profileId already chosen, skip straight to parameters.
  useEffect(() => {
    if (params.get("profileId")) setStep(3);
  }, [params]);

  const { data: organizations, loading: loadingOrgs, error: orgsError } = useAsync(
    () => organizationApi.list(),
    [],
  );

  const { data: profiles, loading: loadingProfiles, error: profilesError } = useAsync(
    () => (organizationId ? productionProfileApi.listByOrganization(organizationId) : productionProfileApi.list()),
    [organizationId],
  );

  const {
    data: profileConfig,
    loading: loadingParams,
    error: paramsError,
  } = useAsync(() => (profileId ? productionProfileApi.parameters(profileId) : Promise.resolve(null)), [
    profileId,
  ]);

  const {
    data: destinations,
    loading: loadingDestinations,
    error: destinationsError,
  } = useAsync(
    () => (organizationId ? deviceApi.printDestinationsByOrganization(organizationId) : deviceApi.printDestinations()),
    [organizationId],
  );

  const parameters = profileConfig?.profileParameters ?? [];

  async function handleConfigure() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const profileParameters: ProductionProfileParameter[] = parameters.map((p) => ({
        ...p,
        value: paramValues[p.name ?? ""] ?? p.defaultValue ?? "",
      }));
      const result = await productionProfileApi.configure({ profileId, profileParameters });
      setTemplate(result);
      setStep(4);
    } catch (err: any) {
      setSubmitError(err?.message ?? "No se pudo configurar el perfil");
    } finally {
      setSubmitting(false);
    }
  }

  function setDestination(destination: string) {
    setTemplate((t) => {
      if (!t) return t;
      return {
        ...t,
        destination,
        organizationId: t.organizationId ?? organizationId ?? undefined,
        services: (t.services ?? []).map((s) => ({ ...s, destination })),
      };
    });
  }

  function updateParameterValue(serviceIndex: number, paramIndex: number, value: string | null) {
    setTemplate((t) => {
      if (!t || !t.services) return t;
      const services = t.services.map((s, si) => {
        if (si !== serviceIndex) return s;
        const parameters = (s.parameters ?? []).map((p, pi) => {
          if (pi !== paramIndex) return p;
          return { ...p, parameter: { ...p.parameter, value } };
        });
        return { ...s, parameters };
      });
      return { ...t, services };
    });
  }

  function updateRequestName(serviceIndex: number, requestName: string) {
    setTemplate((t) => {
      if (!t || !t.services) return t;
      const services = t.services.map((s, si) => (si === serviceIndex ? { ...s, requestName } : s));
      return { ...t, services };
    });
  }

  async function handleSubmitJob() {
    if (!template) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const jobId = await jobApi.submit(template);
      setSubmittedJobId(jobId);
    } catch (err: any) {
      setSubmitError(err?.message ?? "No se pudo enviar el trabajo.");
    } finally {
      setSubmitting(false);
    }
  }

  const canGoStep2 = true; // org is optional filter
  const canGoStep3 = Boolean(profileId);
  const selectedDestination = template?.destination ?? template?.services?.[0]?.destination ?? "";
  const allRequestNamesFilled = (template?.services ?? []).every((s) => (s.requestName ?? "").trim().length > 0);
  const canSubmit = Boolean(selectedDestination) && allRequestNamesFilled && !submitting;

  if (submittedJobId) {
    return (
      <div>
        <PageHeader eyebrow="Nuevo trabajo" title="Trabajo enviado" />
        <div className="stub p-6 border-success/40">
          <p className="text-success font-medium mb-1">✓ Trabajo enviado correctamente</p>
          <p className="font-mono text-sm text-muted mb-4">{submittedJobId}</p>
          <button
            onClick={() => navigate(`/trabajos/${encodeURIComponent(submittedJobId)}`)}
            className="bg-brand text-white font-medium px-4 py-2 rounded hover:bg-brand-dim transition-colors text-sm"
          >
            Ver detalle del trabajo →
          </button>
        </div>
      </div>
    );
  }

  if (isOperational) {
    if (grantedFlows === undefined) {
      return (
        <div>
          <PageHeader eyebrow="Nuevo trabajo" title="Nuevo trabajo de impresión" />
          <div className="stub p-6">
            <Loading label="Cargando tus flujos" />
          </div>
        </div>
      );
    }

    if (grantedFlows.length === 0) {
      return (
        <div>
          <PageHeader eyebrow="Nuevo trabajo" title="Nuevo trabajo de impresión" />
          <div className="stub p-6">
            <p className="text-muted text-sm">
              Todavía no tienes ningún flujo habilitado. Pide a un administrador que te dé acceso a uno desde
              "Usuarios".
            </p>
          </div>
        </div>
      );
    }

    if (!selectedGrantedFlow) {
      return (
        <div>
          <PageHeader eyebrow="Nuevo trabajo" title="Elige un flujo" />
          <div className="stub p-6">
            <div className="space-y-2 max-w-md">
              {grantedFlows.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedGrantedFlow(f)}
                  className="w-full text-left px-4 py-3 rounded-lg border border-border hover:border-brand/40 hover:bg-brand/5 transition-colors"
                >
                  <p className="font-medium text-ink">{f.name}</p>
                  <p className="text-muted text-xs">{f.steps.length} paso(s)</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (!activePending && !manualEntry) {
      return (
        <div>
          <PageHeader eyebrow="Solicitud guiada" title={selectedGrantedFlow.name} />
          <div className="stub p-6 space-y-5">
            <div>
              <p className="text-brand text-xs font-semibold uppercase tracking-wide mb-2">
                Trabajos pendientes (CSV)
              </p>
              <p className="text-muted text-xs mb-3">
                Carga un CSV con varios registros para este flujo — cada fila queda en esta lista, y al enviar el
                trabajo de una fila, desaparece de aquí.
              </p>
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
                <button
                  type="button"
                  onClick={downloadPendingTemplate}
                  className="text-xs text-brand hover:underline"
                >
                  Descargar plantilla CSV
                </button>
              </div>
              <p className="text-muted text-xs mb-3">
                Columnas: <code className="font-mono">{pendingTemplateColumns().join(", ") || "(este flujo no tiene pasos de tipo Campos)"}</code>
              </p>
              {uploadingPending && <p className="text-muted text-xs mb-3">Procesando…</p>}
              {pendingError && (
                <div className="mb-3">
                  <ErrorBanner message={pendingError} />
                </div>
              )}

              {pendingItems === undefined ? (
                <Loading label="Cargando pendientes" />
              ) : pendingItems.length === 0 ? (
                <p className="text-muted text-sm">No hay trabajos pendientes cargados para este flujo.</p>
              ) : (
                <div className="space-y-2">
                  {pendingItems.map((item) => {
                    const summary = Object.values(item.values).filter(Boolean).join(" · ") || "(sin datos)";
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActivePending(item)}
                        className="w-full text-left px-4 py-3 rounded-lg border border-border hover:border-brand/40 hover:bg-brand/5 transition-colors"
                      >
                        <p className="text-ink text-sm truncate">{summary}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-border">
              <button
                onClick={() => (grantedFlows.length > 1 ? setSelectedGrantedFlow(null) : navigate("/"))}
                className="border border-border px-4 py-2 rounded text-sm text-muted hover:text-ink transition-colors"
              >
                ← Atrás
              </button>
              <button
                onClick={() => setManualEntry(true)}
                className="text-sm text-brand hover:underline"
              >
                Registrar manualmente (sin datos precargados) →
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div>
        <PageHeader eyebrow="Solicitud guiada" title={selectedGrantedFlow.name} />
        <div className="stub p-6">
          <GuidedFlowRunner
            steps={selectedGrantedFlow.steps}
            requestNameField={selectedGrantedFlow.requestNameField}
            fetchTemplate={() => flowApi.getTemplate(selectedGrantedFlow.id!)}
            initialValues={activePending?.values}
            submitJob={async (template) => {
              const jobId = await jobApi.submit(template, selectedGrantedFlow.id);
              if (activePending) {
                await flowApi.deletePending(selectedGrantedFlow.id!, activePending.id).catch(() => {});
              }
              return jobId;
            }}
            onBack={() => {
              setActivePending(null);
              setManualEntry(false);
            }}
            onSubmitted={(jobId) => setSubmittedJobId(jobId)}
          />
        </div>
      </div>
    );
  }

  // If the chosen profile has admin-defined guided flow(s), use them
  // instead of the generic parameter/review steps below.
  if (step >= 3 && selectedFlow) {
    return (
      <div>
        <PageHeader eyebrow="Solicitud guiada" title={selectedFlow.name} />
        <div className="stub p-6">
          <GuidedFlowRunner
            steps={selectedFlow.steps}
            requestNameField={selectedFlow.requestNameField}
            fetchTemplate={() => flowApi.getTemplate(selectedFlow.id!)}
            submitJob={(template) => jobApi.submit(template, selectedFlow.id)}
            onBack={() => (availableFlows && availableFlows.length > 1 ? setSelectedFlow(null) : setStep(2))}
            onSubmitted={(jobId) => setSubmittedJobId(jobId)}
          />
        </div>
      </div>
    );
  }

  if (step >= 3 && availableFlows === undefined) {
    return (
      <div>
        <PageHeader eyebrow="Asistente" title="Nuevo trabajo de impresión" />
        <div className="stub p-6">
          <Loading label="Verificando si este perfil tiene un flujo guiado" />
        </div>
      </div>
    );
  }

  if (step >= 3 && availableFlows && availableFlows.length > 1 && !selectedFlow) {
    return (
      <div>
        <PageHeader eyebrow="Solicitud guiada" title="Elige cómo quieres continuar" />
        <div className="stub p-6">
          <div className="space-y-2 max-w-md">
            {availableFlows.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFlow(f)}
                className="w-full text-left px-4 py-3 rounded-lg border border-border hover:border-brand/40 hover:bg-brand/5 transition-colors"
              >
                <p className="font-medium text-ink">{f.name}</p>
                <p className="text-muted text-xs">{f.steps.length} paso(s)</p>
              </button>
            ))}
          </div>
          <div className="mt-5">
            <BackButton onClick={() => setStep(2)} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Asistente"
        title="Nuevo trabajo de impresión"
        description="Organización → perfil → parámetros → envío."
      />

      <Stepper current={step} onJump={(s) => setStep(s)} hideOrgStep={isClient} />

      <div className="stub p-6 mt-6">
        {step === 1 && (
          <div>
            <p className="text-brand text-xs font-semibold uppercase tracking-wide mb-3">
              1 · Elige una organización
            </p>
            {loadingOrgs && <Loading label="Cargando organizaciones" />}
            {orgsError && <ErrorBanner message={orgsError} />}
            {organizations && (
              <select
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                className="input w-full"
              >
                <option value="">(todas / sin filtrar)</option>
                {organizations.map((o, i) => (
                  <option key={o.organizationId ?? i} value={o.organizationId ?? ""}>
                    {o.name ?? o.organizationId}
                  </option>
                ))}
              </select>
            )}
            <div className="flex justify-end mt-5">
              <NextButton disabled={!canGoStep2} onClick={() => setStep(2)} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="text-brand text-xs font-semibold uppercase tracking-wide mb-3">
              2 · Elige un perfil de producción
            </p>
            {loadingProfiles && <Loading label="Cargando perfiles" />}
            {profilesError && <ErrorBanner message={profilesError} />}
            {profiles && profiles.length === 0 && (
              <p className="text-muted text-sm">No hay perfiles para esta organización.</p>
            )}
            {profiles && profiles.length > 0 && (
              <div className="border border-border rounded-lg overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Perfil</th>
                      <th>ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((p, i) => {
                      const id = String(p.profileId ?? i);
                      const isSelected = profileId === id;
                      return (
                        <tr
                          key={id}
                          onClick={() => setProfileId(id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? "bg-brand/10" : "hover:bg-surface-alt"
                          }`}
                        >
                          <td className="font-medium text-ink">{p.name ?? "(sin nombre)"}</td>
                          <td className="text-muted text-xs font-mono">{id}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-between mt-5">
              {isClient ? <span /> : <BackButton onClick={() => setStep(1)} />}
              <NextButton disabled={!canGoStep3} onClick={() => setStep(3)} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="text-brand text-xs font-semibold uppercase tracking-wide mb-3">
              3 · Completa los parámetros
            </p>
            {loadingParams && <Loading label="Cargando parámetros" />}
            {paramsError && <ErrorBanner message={paramsError} />}
            {parameters.length === 0 && !loadingParams && !paramsError && (
              <p className="text-muted text-sm mb-4">Este perfil no requiere parámetros adicionales.</p>
            )}
            <div className="space-y-4">
              {parameters.map((p, i) => (
                <ProfileParameterField
                  key={p.name ?? i}
                  parameter={p}
                  value={paramValues[p.name ?? ""] ?? p.defaultValue ?? ""}
                  onChange={(v) => setParamValues((prev) => ({ ...prev, [p.name ?? String(i)]: v }))}
                />
              ))}
            </div>
            {submitError && (
              <div className="mt-4">
                <ErrorBanner message={submitError} />
              </div>
            )}
            <div className="flex justify-between mt-5">
              <BackButton onClick={() => setStep(2)} />
              <button
                onClick={handleConfigure}
                disabled={submitting}
                className="bg-brand text-white font-medium px-4 py-2 rounded hover:bg-brand-dim transition-colors text-sm disabled:opacity-50"
              >
                {submitting ? "Configurando…" : "Configurar perfil →"}
              </button>
            </div>
          </div>
        )}

        {step === 4 && template && (
          <div>
            <p className="text-brand text-xs font-semibold uppercase tracking-wide mb-3">
              4 · Revisa y envía
            </p>

            <label className="block mb-5">
              <span className="block text-sm mb-1">
                Destino de impresión<span className="text-brand ml-1">*</span>
              </span>
              {loadingDestinations && <Loading label="Cargando destinos de impresión" />}
              {destinationsError && <ErrorBanner message={destinationsError} />}
              {destinations && (
                <select
                  value={selectedDestination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="input w-full"
                >
                  <option value="">(selecciona un destino)</option>
                  {destinations.map((d, i) => (
                    <option key={d.destination ?? i} value={d.destination ?? ""}>
                      {d.printerName ?? d.destination} {d.locationName ? `— ${d.locationName}` : ""}
                    </option>
                  ))}
                </select>
              )}
              {destinations && destinations.length === 0 && (
                <p className="text-muted text-xs mt-1">
                  No se encontraron destinos de impresión para esta organización.
                </p>
              )}
            </label>

            {(template.services ?? []).map((service, serviceIndex) => (
              <ServiceParametersForm
                key={serviceIndex}
                service={service}
                onChangeParameter={(paramIndex, value) => updateParameterValue(serviceIndex, paramIndex, value)}
                onChangeRequestName={(value) => updateRequestName(serviceIndex, value)}
              />
            ))}

            <button
              type="button"
              onClick={() => setShowJson((v) => !v)}
              className="text-xs text-muted hover:text-ink transition-colors mt-2"
            >
              {showJson ? "Ocultar" : "Ver"} datos técnicos (JSON)
            </button>
            {showJson && (
              <div className="mt-2">
                <JsonPreview data={template} />
              </div>
            )}

            {submitError && (
              <div className="mt-4">
                <ErrorBanner message={submitError} />
              </div>
            )}
            <div className="flex justify-between mt-5">
              <BackButton onClick={() => setStep(3)} />
              <button
                onClick={handleSubmitJob}
                disabled={!canSubmit}
                className="bg-brand text-white font-medium px-4 py-2 rounded hover:bg-brand-dim transition-colors text-sm disabled:opacity-50"
              >
                {submitting ? "Enviando…" : "Enviar trabajo →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ServiceParametersForm({
  service,
  onChangeParameter,
  onChangeRequestName,
}: {
  service: CardRequestServiceData;
  onChangeParameter: (paramIndex: number, value: string | null) => void;
  onChangeRequestName: (value: string) => void;
}) {
  const parameters = service.parameters ?? [];

  return (
    <div className="mb-5">
      <p className="text-muted text-xs mb-3">
        {service.name ?? service.templateName ?? "Servicio de solicitud de tarjeta"}
      </p>

      <label className="block mb-4">
        <span className="block mb-1 text-sm">
          Nombre de la solicitud<span className="text-brand ml-1">*</span>
        </span>
        <input
          type="text"
          value={service.requestName ?? ""}
          onChange={(e) => onChangeRequestName(e.target.value)}
          placeholder="p. ej. Credencial — Juan Pérez"
          className="input w-full"
        />
      </label>

      {parameters.length > 0 && (
        <div className="space-y-4">
          {parameters.map((param, i) => (
            <RequestParameterField
              key={param.parameter?.name ?? i}
              param={param}
              onChange={(value) => onChangeParameter(i, value)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Stepper({
  current,
  onJump,
  hideOrgStep,
}: {
  current: Step;
  onJump: (s: Step) => void;
  hideOrgStep?: boolean;
}) {
  const steps: Step[] = hideOrgStep ? [2, 3, 4] : [1, 2, 3, 4];
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => s < current && onJump(s)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${
              s === current
                ? "bg-brand text-white font-medium"
                : s < current
                ? "text-brand border border-brand/40 hover:bg-brand/10"
                : "text-muted border border-border"
            }`}
          >
            <span className="font-mono text-xs">{s}</span>
            <span className="hidden sm:inline">{STEP_LABELS[s]}</span>
          </button>
          {i < steps.length - 1 && <span className="text-border">—</span>}
        </div>
      ))}
    </div>
  );
}

function NextButton({ disabled, onClick }: { disabled?: boolean; onClick: () => void }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="bg-brand text-white font-medium px-4 py-2 rounded hover:bg-brand-dim transition-colors text-sm disabled:opacity-50"
    >
      Siguiente →
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="border border-border px-4 py-2 rounded text-sm text-muted hover:text-ink transition-colors"
    >
      ← Atrás
    </button>
  );
}

