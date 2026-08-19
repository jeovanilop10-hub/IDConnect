import type { RequestParameter } from "../api/types";

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
}: {
  param: RequestParameter;
  onChange: (value: string | null) => void;
}) {
  const data = param.parameter ?? {};
  const dataType = param.dataType ?? data.dataType ?? "Text";
  const value = sanitize(data.value);

  const label = (
    <span className="block mb-1 text-sm">
      {data.name ?? "parámetro"}
      {data.required && <span className="text-brand ml-1">*</span>}
      <span className="text-muted text-xs font-mono ml-2">{dataType}</span>
    </span>
  );

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
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              const base64 = result.split(",")[1] ?? result;
              onChange(base64);
            };
            reader.readAsDataURL(file);
          }}
          className="block w-full text-sm text-muted"
        />
        {value && (
          <p className="text-xs text-success mt-1">Imagen cargada ({Math.round(value.length / 1024)} KB en base64)</p>
        )}
      </label>
    );
  }

  if (dataType === "List" && data.options && data.options.length > 0) {
    return (
      <label className="block">
        {label}
        <select value={value} onChange={(e) => onChange(e.target.value)} className="input w-full">
          <option value="">Elige una opción</option>
          {data.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
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
          onChange={(e) => onChange(e.target.value ? `${e.target.value}T00:00:00` : null)}
          className="input w-full"
        />
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
          onChange={(e) => onChange(e.target.value)}
          placeholder="Escribe un número"
          className="input w-full"
        />
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
        placeholder={`Escribe tu ${(data.name ?? "dato").toLowerCase()}`}
        className="input w-full"
      />
    </label>
  );
}
