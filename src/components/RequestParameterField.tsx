import { Lock } from "lucide-react";
import type { RequestParameter } from "../api/types";
import { fileToBase64 } from "../lib/image";

// Guards against showing a literal "null"/"undefined" string in the input —
// can happen if the API sends back a stringified null instead of a real
// JSON null for an unset value.
function sanitize(raw: unknown): string {
  if (raw == null) return "";
  const str = String(raw);
  return /^(null|undefined)$/i.test(str.trim()) ? "" : str;
}

export default function RequestParameterField({
  param,
  onChange,
  readOnly,
  variant = "portal",
  invalid,
}: {
  param: RequestParameter;
  onChange: (value: string | null) => void;
  // Locks the field instead of just pre-filling it — for data that was
  // already loaded from a CSV/lookup and shouldn't be retyped here.
  readOnly?: boolean;
  // "kiosk": the public capture screen — larger touch targets and no
  // technical data-type tags, since the person filling it isn't an operator.
  variant?: "portal" | "kiosk";
  // Required and still empty after the person tried to continue.
  invalid?: boolean;
}) {
  const data = param.parameter ?? {};
  const dataType = param.dataType ?? data.dataType ?? "Text";
  const value = sanitize(data.value);
  const kiosk = variant === "kiosk";
  const inputClassName = [
    "input w-full",
    // 16px text keeps iOS from zooming into the field on focus.
    kiosk && "text-base px-4 py-3",
    readOnly && "bg-surface-alt text-muted cursor-not-allowed",
    invalid && "border-danger focus:border-danger focus:ring-danger/15",
  ]
    .filter(Boolean)
    .join(" ");
  const fieldName = data.name ?? "parámetro";

  const label = (
    <span className={`flex flex-wrap items-center gap-x-2 mb-1.5 ${kiosk ? "text-sm font-medium text-ink" : "text-sm"}`}>
      <span>
        {fieldName}
        {data.required && <span className="text-danger ml-0.5" aria-hidden>*</span>}
      </span>
      {!kiosk && <span className="text-muted text-xs font-mono">{dataType}</span>}
      {readOnly && (
        <span className="inline-flex items-center gap-1 text-muted text-xs font-normal">
          <Lock size={11} /> Precargado
        </span>
      )}
    </span>
  );

  const invalidHint = invalid ? (
    <span className="block text-danger text-xs mt-1.5" role="alert">
      Este dato es obligatorio.
    </span>
  ) : null;

  if (dataType === "Image") {
    return (
      <label className="block">
        {label}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            fileToBase64(file).then(onChange, () => onChange(null));
          }}
          className="block w-full text-sm text-muted"
        />
        {value && (
          <p className="text-xs text-success mt-1">Imagen cargada ({Math.round(value.length / 1024)} KB en base64)</p>
        )}
        {invalidHint}
      </label>
    );
  }

  if (dataType === "List" && data.options && data.options.length > 0) {
    return (
      <label className="block">
        {label}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          className={inputClassName}
          aria-invalid={invalid || undefined}
          data-param={fieldName}
        >
          <option value="">Elige una opción</option>
          {data.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {invalidHint}
      </label>
    );
  }

  if (dataType === "Date") {
    // The real SDK's DateParameter serializes as LocalDateTime — sending a
    // full ISO local date-time string (not just a bare date) here to match.
    const dateOnly = value.split("T")[0] ?? "";
    return (
      <label className="block">
        {label}
        <input
          type="date"
          value={dateOnly}
          onChange={readOnly ? undefined : (e) => onChange(e.target.value ? `${e.target.value}T00:00:00` : null)}
          readOnly={readOnly}
          className={inputClassName}
          aria-invalid={invalid || undefined}
          data-param={fieldName}
        />
        {invalidHint}
      </label>
    );
  }

  if (dataType === "Integer") {
    return (
      <label className="block">
        {label}
        <input
          type="number"
          value={value}
          onChange={readOnly ? undefined : (e) => onChange(e.target.value)}
          placeholder="Escribe un número"
          readOnly={readOnly}
          className={inputClassName}
          aria-invalid={invalid || undefined}
          data-param={fieldName}
        />
        {invalidHint}
      </label>
    );
  }

  return (
    <label className="block">
      {label}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={readOnly ? undefined : `Escribe tu ${fieldName.toLowerCase()}`}
        readOnly={readOnly}
        enterKeyHint="next"
        className={inputClassName}
        aria-invalid={invalid || undefined}
        data-param={fieldName}
      />
      {invalidHint}
    </label>
  );
}
