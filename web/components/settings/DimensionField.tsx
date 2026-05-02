"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  AUTO_DIM_SENTINEL,
  CUSTOM_DIM_SENTINEL,
  parseSupportedCsv,
  sourceBadge,
  type CatalogModel,
  type EmbeddingCapabilities,
} from "@/lib/settings-helpers";

interface DimensionFieldProps {
  activeModel: CatalogModel;
  activeBinding?: string;
  capabilities: EmbeddingCapabilities | null;
  embeddingDefaultDim: (binding?: string) => string;
  inputClass: string;
  onChangeDimension: (value: string) => void;
}

/**
 * Embedding dimension picker.
 *
 * Dropdown when the model has a known list of supported dims (`supports_
 * variable_dimensions`); free numeric input otherwise. Surfaces a
 * "Detected: Xd · Use this" affordance after a successful API probe.
 */
export function DimensionField({
  activeModel,
  activeBinding,
  capabilities,
  embeddingDefaultDim,
  inputClass,
  onChangeDimension,
}: DimensionFieldProps) {
  const { t } = useTranslation();
  const fallback = embeddingDefaultDim(activeBinding);
  // Raw catalog state — empty string means "not yet configured / auto on
  // next test". We never substitute the fallback into the input value, only
  // into the placeholder, so the user can fully clear the field.
  const rawValue = activeModel.dimension ?? "";
  const isEmpty = rawValue === "";
  const currentNum = isEmpty ? NaN : Number(rawValue);

  // Live capabilities (from current run) override the cached CSV on disk.
  const liveSupported = capabilities?.supported_dimensions;
  const cachedSupported = parseSupportedCsv(activeModel.supported_dimensions);
  const supported =
    liveSupported && liveSupported.length > 0 ? liveSupported : cachedSupported;
  const supportsVariable =
    capabilities?.supports_variable_dimensions ?? supported.length > 1;

  const useDropdown = supported.length > 1 && supportsVariable;
  const currentInList =
    Number.isFinite(currentNum) && supported.includes(currentNum);
  // True when the user explicitly opted out of the dropdown by picking
  // "Custom…". Stays true until they click "Use a supported value" or pick
  // a real value from the dropdown again.
  const [customRequested, setCustomRequested] = useState<boolean>(false);
  // Force custom mode when the catalog has a non-empty value that isn't in
  // the list — that's a sign the user typed something custom and we should
  // respect it. Empty catalog stays in dropdown mode (showing "Auto").
  const customMode =
    customRequested || (useDropdown && !isEmpty && !currentInList);

  const detected = capabilities?.detected_dim;
  const showDetectedBadge =
    typeof detected === "number" &&
    detected > 0 &&
    detected !== currentNum &&
    !isEmpty;

  const sourceInfo = sourceBadge(capabilities?.active_dim_source, t);

  const disabled = activeModel.send_dimensions === false;

  const handleSelect = (value: string) => {
    if (value === CUSTOM_DIM_SENTINEL) {
      setCustomRequested(true);
      return;
    }
    setCustomRequested(false);
    // AUTO_DIM_SENTINEL is "" — clears the catalog, triggers auto-fill on
    // the next test. Real numeric values flow through unchanged.
    onChangeDimension(value);
  };

  const dropdownValue = isEmpty
    ? AUTO_DIM_SENTINEL
    : currentInList
      ? String(currentNum)
      : CUSTOM_DIM_SENTINEL;

  return (
    <div className="space-y-1.5">
      {useDropdown && !customMode ? (
        <select
          className={inputClass}
          value={dropdownValue}
          onChange={(e) => handleSelect(e.target.value)}
          disabled={disabled}
        >
          <option value={AUTO_DIM_SENTINEL}>
            {t("Auto (probe on next test)")}
          </option>
          {supported.map((dim) => (
            <option key={dim} value={String(dim)}>
              {dim}
            </option>
          ))}
          <option value={CUSTOM_DIM_SENTINEL}>{t("Custom…")}</option>
        </select>
      ) : (
        <input
          className={inputClass}
          value={rawValue}
          placeholder={fallback}
          onChange={(e) => onChangeDimension(e.target.value)}
          disabled={disabled}
          inputMode="numeric"
        />
      )}
      {useDropdown && customMode && (
        <button
          type="button"
          onClick={() => {
            setCustomRequested(false);
            if (isEmpty) {
              return;
            }
            // Snap to the closest supported value to keep the catalog honest.
            const closest = supported.reduce((acc, dim) =>
              Math.abs(dim - currentNum) < Math.abs(acc - currentNum)
                ? dim
                : acc,
            );
            onChangeDimension(String(closest));
          }}
          className="text-[11px] text-[var(--muted-foreground)] underline-offset-2 hover:underline"
        >
          {t("Use a supported value")}
        </button>
      )}
      {sourceInfo && (
        <div
          className={`text-[11px] ${
            sourceInfo.tone === "warn"
              ? "text-amber-600 dark:text-amber-400"
              : sourceInfo.tone === "ok"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-[var(--muted-foreground)]"
          }`}
        >
          {sourceInfo.label}
        </div>
      )}
      {showDetectedBadge && (
        <div className="flex items-center gap-2 text-[11px] text-[var(--muted-foreground)]">
          <span>
            {t("Detected")}: <strong>{detected}d</strong>
          </span>
          <button
            type="button"
            onClick={() => onChangeDimension(String(detected))}
            className="rounded-md border border-[var(--border)]/60 px-1.5 py-0.5 text-[10px] text-[var(--foreground)] transition-colors hover:border-[var(--border)]"
            disabled={disabled}
          >
            {t("Use this")}
          </button>
        </div>
      )}
    </div>
  );
}
