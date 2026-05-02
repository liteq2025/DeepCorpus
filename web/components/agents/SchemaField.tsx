"use client";

import { Eye, EyeOff } from "lucide-react";

import {
  defaultFor,
  humaniseKey,
  isNullable,
  resolveSchemaVariant,
  type JsonSchema,
} from "@/lib/agents-helpers";

interface SchemaFieldProps {
  fieldKey: string;
  schema: JsonSchema;
  value: unknown;
  onChange: (next: unknown) => void;
  secretFields: Set<string>;
  path: string;
  showSecretFor: Set<string>;
  toggleSecret: (path: string) => void;
}

/**
 * Generic schema-driven form field renderer — recursive for nested objects.
 *
 * Extracted from /agents page (Phase 2 slice 2.1) — see
 * docs/refactor/phase-2-megapages.md.
 *
 * Boolean → checkbox, enum → select, string-array → textarea (one per line),
 * object → recursive fieldset, integer/number → number input, default →
 * text input (with eye-icon secret reveal toggle when in secretFields).
 */
export function SchemaField({
  fieldKey,
  schema,
  value,
  onChange,
  secretFields,
  path,
  showSecretFor,
  toggleSecret,
}: SchemaFieldProps) {
  const v = resolveSchemaVariant(schema);
  const label = schema.title || v.title || humaniseKey(fieldKey);
  const description = schema.description || v.description;
  const isSecret = secretFields.has(path);
  const enumValues = (v.enum ?? schema.enum) as unknown[] | undefined;

  // Boolean → checkbox row (label inline).
  if (v.type === "boolean") {
    return (
      <label className="flex items-start gap-2 text-[13px]">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          {label}
          {description && (
            <span className="ml-1 text-[11px] text-[var(--muted-foreground)]">
              — {description}
            </span>
          )}
        </span>
      </label>
    );
  }

  // Enum / Literal → select.
  if (Array.isArray(enumValues) && enumValues.length > 0) {
    return (
      <div>
        <FieldLabel label={label} description={description} />
        <select
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-1.5 text-[13px] outline-none focus:border-[var(--ring)]"
        >
          {enumValues.map((opt) => (
            <option key={String(opt)} value={String(opt)}>
              {String(opt)}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Array of strings → textarea (one per line). For non-string arrays we
  // fall through to JSON editing below.
  if (v.type === "array" && (v.items?.type === "string" || !v.items)) {
    const lines = Array.isArray(value) ? (value as unknown[]).map(String) : [];
    return (
      <div>
        <FieldLabel
          label={label}
          description={description ?? "One value per line"}
        />
        <textarea
          value={lines.join("\n")}
          onChange={(e) =>
            onChange(
              e.target.value
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
          rows={Math.max(3, Math.min(8, lines.length + 1))}
          className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 font-mono text-[13px] outline-none focus:border-[var(--ring)]"
        />
      </div>
    );
  }

  // Nested object → recursive fieldset.
  if (v.type === "object" && v.properties) {
    const obj = (value && typeof value === "object" ? value : {}) as Record<
      string,
      unknown
    >;
    return (
      <fieldset className="rounded-lg border border-[var(--border)]/60 px-3 py-2.5 space-y-2.5">
        <legend className="px-1 text-[12px] font-medium text-[var(--muted-foreground)]">
          {label}
        </legend>
        {description && (
          <p className="text-[11px] text-[var(--muted-foreground)]">
            {description}
          </p>
        )}
        {Object.entries(v.properties).map(([k, child]) => (
          <SchemaField
            key={k}
            fieldKey={k}
            schema={child}
            value={obj[k] ?? defaultFor(child)}
            onChange={(next) => onChange({ ...obj, [k]: next })}
            secretFields={secretFields}
            path={path ? `${path}.${k}` : k}
            showSecretFor={showSecretFor}
            toggleSecret={toggleSecret}
          />
        ))}
      </fieldset>
    );
  }

  // Integer/number → number input.
  if (v.type === "integer" || v.type === "number") {
    return (
      <div>
        <FieldLabel label={label} description={description} />
        <input
          type="number"
          value={typeof value === "number" ? value : ""}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") onChange(isNullable(schema) ? null : 0);
            else
              onChange(
                v.type === "integer" ? parseInt(raw, 10) : parseFloat(raw),
              );
          }}
          className="w-40 rounded-lg border border-[var(--border)] bg-transparent px-3 py-1.5 text-[13px] outline-none focus:border-[var(--ring)]"
        />
      </div>
    );
  }

  // Default: string input (with secret reveal handling).
  const reveal = showSecretFor.has(path);
  const strVal = value == null ? "" : String(value);
  return (
    <div>
      <FieldLabel label={label} description={description} />
      <div className="relative">
        <input
          type={isSecret && !reveal ? "password" : "text"}
          autoComplete={isSecret ? "new-password" : "off"}
          spellCheck={!isSecret}
          value={strVal}
          onChange={(e) => {
            const next = e.target.value;
            // Empty optional strings persist as null (matches Pydantic's
            // `Optional[str]` default and avoids "" sneaking past validators).
            onChange(next === "" && isNullable(schema) ? null : next);
          }}
          className={`w-full rounded-lg border border-[var(--border)] bg-transparent py-2 pl-3 ${isSecret ? "pr-10 font-mono" : "pr-3"} text-[13px] outline-none focus:border-[var(--ring)]`}
        />
        {isSecret && (
          <button
            type="button"
            onClick={() => toggleSecret(path)}
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            aria-label={reveal ? "Hide secret" : "Show secret"}
            title={reveal ? "Hide secret" : "Show secret"}
          >
            {reveal ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

interface FieldLabelProps {
  label: string;
  description?: string;
}

export function FieldLabel({ label, description }: FieldLabelProps) {
  return (
    <label className="mb-1 block text-[12px] font-medium text-[var(--muted-foreground)]">
      {label}
      {description && (
        <span className="ml-1 font-normal opacity-70">— {description}</span>
      )}
    </label>
  );
}
