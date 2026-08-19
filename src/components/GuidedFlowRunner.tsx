import { useEffect, useState } from "react";
import { ErrorBanner, Loading } from "./Feedback";
import CameraCapture from "./CameraCapture";
import RequestParameterField from "./RequestParameterField";
import type { FlowStep, ProductionRequestTemplate } from "../api/types";

export default function GuidedFlowRunner({
  steps,
  requestNameField,
  fetchTemplate,
  submitJob,
  onBack,
  onSubmitted,
}: {
  steps: FlowStep[];
  requestNameField?: string | null;
  fetchTemplate: () => Promise<ProductionRequestTemplate>;
  submitJob: (template: ProductionRequestTemplate) => Promise<string>;
  onBack: () => void;
  onSubmitted: (jobId: string) => void;
}) {
  const [template, setTemplate] = useState<ProductionRequestTemplate | null>(null);
  const [configuring, setConfiguring] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  // Index 0..n-1 map to the admin-defined steps; the last index is always a
  // fixed "review & confirm" summary step. The print destination is no
  // longer picked here — the admin configures it once in the flow builder
  // and the backend applies it automatically when building the template.
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setConfiguring(true);
      setConfigError(null);
      try {
        const templateResult = await fetchTemplate();
        if (!cancelled) setTemplate(templateResult);
      } catch (err: any) {
        if (!cancelled) setConfigError(err?.message ?? "No se pudo preparar la solicitud para este perfil.");
      } finally {
        if (!cancelled) setConfiguring(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setParamValue(name: string, value: string | null) {
    setTemplate((t) => {
      if (!t) return t;
      const services = (t.services ?? []).map((s) => ({
        ...s,
        parameters: (s.parameters ?? []).map((p) =>
          p.parameter?.name === name ? { ...p, parameter: { ...p.parameter, value } } : p,
        ),
      }));
      return { ...t, services };
    });
  }

  function findParamValue(name: string): string {
    for (const service of template?.services ?? []) {
      for (const p of service.parameters ?? []) {
        if (p.parameter?.name === name) return p.parameter.value != null ? String(p.parameter.value) : "";
      }
    }
    return "";
  }

  function findParam(name: string) {
    for (const service of template?.services ?? []) {
      for (const p of service.parameters ?? []) {
        if (p.parameter?.name === name) return p;
      }
    }
    return null;
  }

  const totalSteps = steps.length + 1; // admin-defined steps + review
  const isReviewStep = stepIndex === totalSteps - 1;
  const step = isReviewStep ? null : steps[stepIndex];
  const isLastStep = isReviewStep;
  const destination = template?.destination ?? template?.services?.[0]?.destination ?? "";

  function stepIsValid(): boolean {
    if (isReviewStep) return true;
    if (!step) return false;
    if (step.type === "INFO") return true;
    if (step.type === "PHOTO") {
      const name = step.parameterNames?.[0];
      return Boolean(name && findParamValue(name));
    }
    if (step.type === "FIELDS") {
      return (step.parameterNames ?? []).every((name) => {
        const p = findParam(name);
        if (!p?.parameter?.required) return true;
        return Boolean(findParamValue(name));
      });
    }
    return true;
  }

  async function handleNext() {
    if (!isLastStep) {
      setStepIndex((i) => i + 1);
      return;
    }
    if (!template) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      // Resolve the job's requestName (required by the SDK) from the
      // admin-chosen field (e.g. employee ID/SOEID), falling back to an
      // auto-generated name if none was configured.
      const resolvedName = requestNameField ? findParamValue(requestNameField) : "";
      const requestName = resolvedName || `Solicitud ${new Date().toLocaleString()}`;
      const finalTemplate: ProductionRequestTemplate = {
        ...template,
        services: (template.services ?? []).map((s) => ({ ...s, requestName })),
      };

      const jobId = await submitJob(finalTemplate);
      onSubmitted(jobId);
    } catch (err: any) {
      setSubmitError(err?.message ?? "No se pudo enviar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  }

  if (configuring) {
    return <Loading label="Preparando tu solicitud" />;
  }

  if (configError) {
    return <ErrorBanner message={configError} onRetry={onBack} />;
  }

  if (!template) {
    return <ErrorBanner message="No se pudo preparar este perfil." onRetry={onBack} />;
  }

  // Every FIELDS/PHOTO parameter across all admin-defined steps, for the
  // final review summary — in the order the admin defined the steps.
  const capturedItems = steps.flatMap((s) => {
    if (s.type === "FIELDS") {
      return (s.parameterNames ?? []).map((name) => {
        const p = findParam(name);
        return { name, label: p?.parameter?.name ?? name, value: findParamValue(name), isImage: false };
      });
    }
    if (s.type === "PHOTO") {
      const name = s.parameterNames?.[0];
      if (!name) return [];
      return [{ name, label: s.title || name, value: findParamValue(name), isImage: true }];
    }
    return [];
  });

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-7">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full transition-colors duration-300 ${
              i <= stepIndex ? "bg-brand" : "bg-border"
            }`}
          />
        ))}
      </div>

      <p className="text-muted text-xs mb-1">
        Paso {stepIndex + 1} de {totalSteps}
      </p>

      {!isReviewStep && step && (
        <>
          <h2 className="font-display text-2xl font-bold text-ink mb-2">{step.title || "Paso sin título"}</h2>
          {step.instructions && <p className="text-muted text-sm mb-5 max-w-lg">{step.instructions}</p>}

          <div className="mb-6">
            {step.type === "PHOTO" && step.parameterNames?.[0] && (
              <CameraCapture
                value={(() => {
                  const v = findParamValue(step.parameterNames![0]);
                  return v || null;
                })()}
                onCapture={(base64) => setParamValue(step.parameterNames![0], base64)}
              />
            )}

            {step.type === "FIELDS" && (
              <div className="space-y-4 max-w-md">
                {(step.parameterNames ?? []).map((name) => {
                  const p = findParam(name);
                  if (!p) return null;
                  return <RequestParameterField key={name} param={p} onChange={(v) => setParamValue(name, v)} />;
                })}
              </div>
            )}
          </div>
        </>
      )}

      {isReviewStep && (
        <>
          <h2 className="font-display text-2xl font-bold text-ink mb-2">Confirma tu solicitud</h2>
          <p className="text-muted text-sm mb-5 max-w-lg">
            Revisa que todo esté correcto antes de enviarla — no podrás editarla después.
          </p>

          <CredentialCardPreview
            photo={capturedItems.find((i) => i.isImage)?.value}
            lines={capturedItems.filter((i) => !i.isImage).map((i) => i.value).filter(Boolean)}
          />

          <div className="space-y-3 max-w-md mt-6 mb-6">
            {destination && (
              <div className="field-box">
                <p className="field-label">Destino de impresión</p>
                <p className="field-value">{destination}</p>
              </div>
            )}

            {capturedItems.map((item) =>
              item.isImage ? (
                <div key={item.name} className="field-box">
                  <p className="field-label">{item.label}</p>
                  {item.value ? (
                    <img
                      src={`data:image/jpeg;base64,${item.value}`}
                      alt={item.label}
                      className="w-24 h-24 object-cover rounded-lg border border-border mt-1"
                    />
                  ) : (
                    <p className="field-value text-muted">—</p>
                  )}
                </div>
              ) : (
                <div key={item.name} className="field-box">
                  <p className="field-label">{item.label}</p>
                  <p className="field-value">{item.value || "—"}</p>
                </div>
              ),
            )}
          </div>
        </>
      )}

      {submitError && (
        <div className="mb-4">
          <ErrorBanner message={submitError} />
        </div>
      )}

      <div className="flex justify-between gap-3">
        <button
          onClick={() => (stepIndex === 0 ? onBack() : setStepIndex((i) => i - 1))}
          className="border border-border px-5 py-3 rounded-xl text-sm font-medium text-muted hover:text-ink hover:bg-surface-alt transition-colors"
        >
          ← Atrás
        </button>
        <button
          onClick={handleNext}
          disabled={!stepIsValid() || submitting}
          className="flex-1 sm:flex-none bg-brand text-white font-semibold px-6 py-3 rounded-xl hover:bg-brand-dim transition-colors text-sm disabled:opacity-50 shadow-sm"
        >
          {isLastStep ? (submitting ? "Enviando…" : "Confirmar y enviar") : "Siguiente →"}
        </button>
      </div>
    </div>
  );
}

/**
 * A small mockup styled like a physical ID card — the first captured text
 * value reads as the prominent "name" line, the rest as supporting details.
 * Purely visual (doesn't affect what gets submitted); gives the person a
 * tangible sense of what they're about to confirm rather than just a plain
 * list of field/value pairs.
 */
function CredentialCardPreview({ photo, lines }: { photo?: string; lines: string[] }) {
  const [primary, ...rest] = lines;

  return (
    <div className="max-w-sm mx-auto rounded-2xl border border-border shadow-md overflow-hidden bg-surface">
      <div className="h-2.5 bg-brand" />
      <div className="p-4 flex gap-4 items-center">
        <div className="w-20 h-24 shrink-0 rounded-lg overflow-hidden border border-border bg-surface-alt flex items-center justify-center">
          {photo ? (
            <img src={`data:image/jpeg;base64,${photo}`} alt="Foto" className="w-full h-full object-cover" />
          ) : (
            <span className="text-muted text-[10px] text-center px-1">Sin foto</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-ink text-lg leading-tight truncate">{primary || "—"}</p>
          {rest.map((line, i) => (
            <p key={i} className="text-muted text-sm truncate">
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
