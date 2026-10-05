import { FormEvent, useEffect, useRef, useState } from "react";
import { Check, Pencil } from "lucide-react";
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
  initialValues,
  variant = "portal",
}: {
  steps: FlowStep[];
  requestNameField?: string | null;
  fetchTemplate: () => Promise<ProductionRequestTemplate>;
  submitJob: (template: ProductionRequestTemplate) => Promise<string>;
  // Back from the first step. When omitted (kiosk without an identifier
  // screen) there is nowhere to go back to, so the button is hidden.
  onBack?: () => void;
  onSubmitted: (jobId: string) => void;
  // Parameter name -> value pairs to pre-fill once the template loads (e.g.
  // from the kiosk's identifier lookup, or an OPERATIONAL user's pending-jobs
  // CSV row). Locked, not just pre-filled: this is data someone already
  // loaded as authoritative, so the FIELDS step for it renders read-only
  // instead of letting it be retyped.
  initialValues?: Record<string, string>;
  // "kiosk": public capture screen — bigger touch targets, buttons in the
  // flow's own brand color, no technical parameter details.
  variant?: "portal" | "kiosk";
}) {
  const kiosk = variant === "kiosk";
  const lockedFieldNames = new Set(
    Object.entries(initialValues ?? {})
      .filter(([, value]) => value !== undefined && value !== "")
      .map(([name]) => name),
  );
  const [template, setTemplate] = useState<ProductionRequestTemplate | null>(null);
  const [configuring, setConfiguring] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  // Index 0..n-1 map to the admin-defined steps; the last index is always a
  // fixed "review & confirm" summary step. The print destination is no
  // longer picked here — the admin configures it once in the flow builder
  // and the backend applies it automatically when building the template.
  const [stepIndex, setStepIndex] = useState(0);
  // Set once the person tried to continue with missing data on this step:
  // only then are the missing fields marked, instead of from the start.
  const [showErrors, setShowErrors] = useState(false);
  // True when a step was opened from the review's "Editar": continuing goes
  // straight back to the review instead of through the remaining steps.
  const [editingFromReview, setEditingFromReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setConfiguring(true);
      setConfigError(null);
      try {
        let templateResult = await fetchTemplate();
        if (initialValues && Object.keys(initialValues).length > 0) {
          templateResult = {
            ...templateResult,
            services: (templateResult.services ?? []).map((s) => ({
              ...s,
              parameters: (s.parameters ?? []).map((p) => {
                const name = p.parameter?.name;
                const value = name ? initialValues[name] : undefined;
                return value !== undefined ? { ...p, parameter: { ...p.parameter, value } } : p;
              }),
            })),
          };
        }
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

  // Each step starts at the top of the screen, with its first editable field focused.
  useEffect(() => {
    if (configuring) return;
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    const firstInput = bodyRef.current?.querySelector<HTMLElement>("input:not([readonly]):not([type=file]), select:not([disabled])");
    // Skip auto-focus on touch screens: it would pop the keyboard over the instructions.
    if (firstInput && !window.matchMedia("(pointer: coarse)").matches) firstInput.focus({ preventScroll: true });
  }, [stepIndex, configuring]);

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
  const reviewIndex = totalSteps - 1;
  const isReviewStep = stepIndex === reviewIndex;
  const step = isReviewStep ? null : steps[stepIndex];
  const destination = template?.destination ?? template?.services?.[0]?.destination ?? "";

  function missingFieldsOf(s: FlowStep | null): string[] {
    if (!s || s.type === "INFO") return [];
    if (s.type === "PHOTO") {
      const name = s.parameterNames?.[0];
      return name && !findParamValue(name) ? [name] : [];
    }
    return (s.parameterNames ?? []).filter((name) => {
      const p = findParam(name);
      return Boolean(p?.parameter?.required) && !findParamValue(name);
    });
  }

  const missing = missingFieldsOf(step);

  function goTo(index: number) {
    setShowErrors(false);
    setSubmitError(null);
    setStepIndex(index);
  }

  function editStep(index: number) {
    setEditingFromReview(true);
    goTo(index);
  }

  async function handleNext(e?: FormEvent) {
    e?.preventDefault();
    if (!isReviewStep) {
      if (missing.length > 0) {
        setShowErrors(true);
        bodyRef.current
          ?.querySelector<HTMLElement>(`[data-param="${CSS.escape(missing[0])}"]`)
          ?.focus();
        return;
      }
      if (editingFromReview) {
        setEditingFromReview(false);
        goTo(reviewIndex);
      } else {
        goTo(stepIndex + 1);
      }
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
      setSubmitError(err?.message ?? "No se pudo enviar la solicitud. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleBack() {
    if (editingFromReview) {
      setEditingFromReview(false);
      goTo(reviewIndex);
    } else if (stepIndex > 0) {
      goTo(stepIndex - 1);
    } else {
      onBack?.();
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
  // final review summary — grouped by the step that captured it, in the
  // order the admin defined the steps.
  const reviewGroups = steps
    .map((s, index) => {
      if (s.type === "FIELDS") {
        return {
          index,
          title: s.title || `Paso ${index + 1}`,
          items: (s.parameterNames ?? []).map((name) => ({
            name,
            label: findParam(name)?.parameter?.name ?? name,
            value: findParamValue(name),
            isImage: false,
            locked: lockedFieldNames.has(name),
          })),
        };
      }
      if (s.type === "PHOTO" && s.parameterNames?.[0]) {
        const name = s.parameterNames[0];
        return {
          index,
          title: s.title || "Foto",
          items: [{ name, label: s.title || name, value: findParamValue(name), isImage: true, locked: false }],
        };
      }
      return null;
    })
    .filter((g): g is NonNullable<typeof g> => g !== null && g.items.length > 0);
  const capturedItems = reviewGroups.flatMap((g) => g.items);

  const stepTitle = (s: FlowStep | undefined, i: number) =>
    i === reviewIndex ? "Confirmar" : s?.title || `Paso ${i + 1}`;

  const primaryButtonClass = kiosk
    ? "inline-flex items-center justify-center gap-2 bg-brand text-white font-display font-semibold px-7 py-3.5 rounded-full hover:bg-brand-dim transition-colors text-base disabled:opacity-50"
    : "btn-primary px-6 py-3 text-sm disabled:opacity-50";
  const secondaryButtonClass = `border border-border rounded-full font-medium text-muted hover:text-ink hover:bg-surface-alt transition-colors ${
    kiosk ? "px-6 py-3.5 text-base" : "px-5 py-3 text-sm"
  }`;

  const nextLabel = isReviewStep
    ? submitting
      ? "Enviando…"
      : "Confirmar y enviar"
    : editingFromReview
    ? "Guardar y volver"
    : stepIndex === reviewIndex - 1
    ? "Revisar →"
    : "Siguiente →";

  return (
    <div ref={topRef} className="scroll-mt-6">
      {/* Progress: one segment per step; the current step's name is spelled out below. */}
      <ol className="flex items-center gap-1.5 mb-3" aria-label="Progreso">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <li
            key={i}
            aria-current={i === stepIndex ? "step" : undefined}
            title={stepTitle(steps[i], i)}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              i < stepIndex ? "bg-brand" : i === stepIndex ? "bg-brand/60" : "bg-border"
            }`}
          />
        ))}
      </ol>
      <p className="data-label mb-5">
        Paso {stepIndex + 1} de {totalSteps}
        {!isReviewStep && (
          <span className="normal-case tracking-normal"> · Sigue: {stepTitle(steps[stepIndex + 1], stepIndex + 1)}</span>
        )}
      </p>

      <form onSubmit={handleNext} noValidate>
        <div ref={bodyRef}>
          {!isReviewStep && step && (
            <>
              <h2 className={`font-display font-bold text-ink mb-2 ${kiosk ? "text-2xl sm:text-[1.75rem] leading-tight" : "text-2xl"}`}>
                {step.title || "Paso sin título"}
              </h2>
              {step.instructions && (
                <p className={`text-muted mb-6 max-w-lg whitespace-pre-line ${kiosk ? "text-base" : "text-sm"}`}>
                  {step.instructions}
                </p>
              )}

              <div className="mb-6">
                {step.type === "PHOTO" && step.parameterNames?.[0] && (
                  <>
                    <CameraCapture
                      value={findParamValue(step.parameterNames[0]) || null}
                      onCapture={(base64) => setParamValue(step.parameterNames![0], base64)}
                    />
                    {showErrors && missing.length > 0 && (
                      <p className="text-danger text-sm text-center mt-3" role="alert">
                        Toma o sube una foto para continuar.
                      </p>
                    )}
                  </>
                )}

                {step.type === "FIELDS" && (
                  <div className={`max-w-md ${kiosk ? "space-y-5" : "space-y-4"}`}>
                    {(step.parameterNames ?? []).map((name) => {
                      const p = findParam(name);
                      if (!p) return null;
                      return (
                        <RequestParameterField
                          key={name}
                          param={p}
                          onChange={(v) => setParamValue(name, v)}
                          readOnly={lockedFieldNames.has(name)}
                          variant={variant}
                          invalid={showErrors && missing.includes(name)}
                        />
                      );
                    })}
                    {(step.parameterNames ?? []).some((name) => findParam(name)?.parameter?.required) && (
                      <p className="text-muted text-xs">
                        <span className="text-danger">*</span> Dato obligatorio
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {isReviewStep && (
            <>
              <h2 className={`font-display font-bold text-ink mb-2 ${kiosk ? "text-2xl sm:text-[1.75rem] leading-tight" : "text-2xl"}`}>
                Confirma tu solicitud
              </h2>
              <p className={`text-muted mb-6 max-w-lg ${kiosk ? "text-base" : "text-sm"}`}>
                Revisa que todo esté correcto. Después de enviarla ya no podrás cambiarla.
              </p>

              <CredentialCardPreview
                photo={capturedItems.find((i) => i.isImage)?.value}
                lines={capturedItems.filter((i) => !i.isImage).map((i) => i.value).filter(Boolean)}
              />

              <div className="space-y-4 mt-6 mb-6">
                {reviewGroups.map((group) => (
                  <section key={group.index} className="border border-border rounded-lg">
                    <header className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border bg-surface-alt rounded-t-lg">
                      <p className="data-label">{group.title}</p>
                      {group.items.some((i) => !i.locked) && (
                        <button
                          type="button"
                          onClick={() => editStep(group.index)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline py-1"
                        >
                          <Pencil size={13} /> Editar
                        </button>
                      )}
                    </header>
                    <dl className="divide-y divide-border">
                      {group.items.map((item) => (
                        <div key={item.name} className="flex items-center justify-between gap-4 px-4 py-2.5">
                          <dt className="text-muted text-sm">{item.label}</dt>
                          <dd className="text-ink text-sm font-medium text-right break-all">
                            {item.isImage ? (
                              item.value ? (
                                <img
                                  src={`data:image/jpeg;base64,${item.value}`}
                                  alt={item.label}
                                  className="w-12 h-16 object-cover rounded border border-border inline-block"
                                />
                              ) : (
                                "—"
                              )
                            ) : (
                              item.value || "—"
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}

                {destination && !kiosk && (
                  <div className="field-box">
                    <p className="field-label">Destino de impresión</p>
                    <p className="field-value">{destination}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {submitError && (
          <div className="mb-4">
            <ErrorBanner message={submitError} />
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
          {(stepIndex > 0 || onBack || editingFromReview) && (
            <button type="button" onClick={handleBack} disabled={submitting} className={secondaryButtonClass}>
              {editingFromReview ? "Cancelar" : "← Atrás"}
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className={`${primaryButtonClass} sm:ml-auto ${kiosk ? "sm:min-w-[12rem]" : ""}`}
          >
            {isReviewStep && !submitting && <Check size={18} strokeWidth={2.5} />}
            {nextLabel}
          </button>
        </div>
      </form>
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
    <div className="max-w-sm mx-auto rounded-2xl border border-border shadow-md shadow-black/5 overflow-hidden bg-surface aspect-[1.586]">
      <div className="h-full flex flex-col">
        <div className="h-3 bg-gradient-to-r from-brand to-brand-dim" />
        <div className="flex-1 p-4 flex gap-4 items-center">
          <div className="w-[30%] aspect-[3/4] shrink-0 rounded-lg overflow-hidden border border-border bg-surface-alt flex items-center justify-center">
            {photo ? (
              <img src={`data:image/jpeg;base64,${photo}`} alt="Foto" className="w-full h-full object-cover" />
            ) : (
              <span className="text-muted text-[10px] text-center px-1">Sin foto</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display font-bold text-ink text-lg leading-tight line-clamp-2">{primary || "—"}</p>
            {rest.slice(0, 3).map((line, i) => (
              <p key={i} className="text-muted text-sm truncate">
                {line}
              </p>
            ))}
          </div>
        </div>
        <p className="px-4 pb-2 text-[10px] text-muted text-right font-mono uppercase tracking-[0.08em]">Vista previa</p>
      </div>
    </div>
  );
}
