import { ReactNode } from "react";
import MonthPicker from "@ui/components/form/month-picker";
import DatePicker from "@ui/components/form/date-picker";
import FormField from "@ui/components/form/FormField";
import { currentMonthDateRange } from "@/features/relatorios/services/relatorios.service";

export type PeriodFilterMode = "mes" | "periodo";

export type PeriodFilterValues = {
  filterMode: PeriodFilterMode;
  mesPagamento: string;
  from: string;
  to: string;
};

export type PeriodFilterLabels = {
  mesOption?: string;
  periodOption?: string;
  mesField?: string;
  fromField?: string;
  toField?: string;
};

const DEFAULT_LABELS: Required<PeriodFilterLabels> = {
  mesOption: "Por mês de pagamento",
  periodOption: "Por período de pagamento",
  mesField: "Mês de pagamento",
  fromField: "Pagamento de",
  toField: "Pagamento até",
};

export function validatePeriodFilter(values: PeriodFilterValues): string | null {
  if (values.filterMode !== "periodo") return null;
  if (!values.from || !values.to) {
    return "Informe a data inicial e a data final do período.";
  }
  if (values.from > values.to) {
    return "A data inicial não pode ser posterior à data final.";
  }
  return null;
}

export function applyPeriodModeChange(
  mode: PeriodFilterMode,
  values: PeriodFilterValues,
): Partial<PeriodFilterValues> {
  if (mode === "periodo" && !values.from && !values.to) {
    const range = currentMonthDateRange();
    return { filterMode: mode, from: range.from, to: range.to };
  }
  return { filterMode: mode };
}

type PeriodFilterFormProps = {
  values: PeriodFilterValues;
  onChange: (patch: Partial<PeriodFilterValues>) => void;
  radioName: string;
  labels?: PeriodFilterLabels;
  gridClassName?: string;
  children?: ReactNode;
};

export function PeriodFilterForm({
  values,
  onChange,
  radioName,
  labels: labelsProp,
  gridClassName = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
  children,
}: PeriodFilterFormProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };

  const handleModeChange = (mode: PeriodFilterMode) => {
    onChange(applyPeriodModeChange(mode, values));
  };

  return (
    <>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="radio"
            name={radioName}
            checked={values.filterMode === "mes"}
            onChange={() => handleModeChange("mes")}
            className="text-brand-500"
          />
          {labels.mesOption}
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="radio"
            name={radioName}
            checked={values.filterMode === "periodo"}
            onChange={() => handleModeChange("periodo")}
            className="text-brand-500"
          />
          {labels.periodOption}
        </label>
      </div>

      <div className={gridClassName}>
        {values.filterMode === "mes" ? (
          <FormField label={labels.mesField} required>
            <MonthPicker
              value={values.mesPagamento}
              onChange={(mesPagamento) => onChange({ mesPagamento })}
              required
            />
          </FormField>
        ) : (
          <>
            <FormField label={labels.fromField}>
              <DatePicker
                value={values.from}
                onChange={(from) => onChange({ from })}
                max={values.to || undefined}
              />
            </FormField>
            <FormField label={labels.toField}>
              <DatePicker
                value={values.to}
                onChange={(to) => onChange({ to })}
                min={values.from || undefined}
              />
            </FormField>
          </>
        )}
        {children}
      </div>
    </>
  );
}
