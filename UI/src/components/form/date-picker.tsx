import { useEffect, useId, useRef } from "react";
import flatpickr from "flatpickr";
import type { Instance } from "flatpickr/dist/types/instance";
import "flatpickr/dist/flatpickr.css";
import { CalenderIcon } from "../../icons";

const INPUT_CLASS =
  "h-11 w-full rounded-lg border appearance-none px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800";

type DatePickerProps = {
  id?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  min?: string;
  max?: string;
};

export default function DatePicker({
  id,
  value = "",
  onChange,
  placeholder = "dd/mm/aaaa",
  disabled = false,
  className = "",
  min,
  max,
}: DatePickerProps) {
  const autoId = useId().replace(/:/g, "");
  const inputId = id ?? `date-picker-${autoId}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<Instance | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!inputRef.current) return;

    pickerRef.current = flatpickr(inputRef.current, {
      static: true,
      monthSelectorType: "static",
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "d/m/Y",
      locale: {
        firstDayOfWeek: 0,
      },
      minDate: min || undefined,
      maxDate: max || undefined,
      defaultDate: value || undefined,
      onChange: (_dates, dateStr) => {
        onChangeRef.current?.(dateStr);
      },
    });

    return () => {
      pickerRef.current?.destroy();
      pickerRef.current = null;
    };
  }, [inputId, min, max]);

  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker) return;
    if (value) {
      picker.setDate(value, false);
    } else {
      picker.clear();
    }
  }, [value]);

  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker) return;
    if (disabled) picker.input.setAttribute("disabled", "true");
    else picker.input.removeAttribute("disabled");
  }, [disabled]);

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        placeholder={placeholder}
        disabled={disabled}
        readOnly
        className={`${INPUT_CLASS} ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={() => pickerRef.current?.open()}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 disabled:opacity-40"
        aria-label="Abrir calendário"
      >
        <CalenderIcon className="size-6" />
      </button>
    </div>
  );
}
