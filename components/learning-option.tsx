import React from "react";
import { cn } from "@/lib/utils";

interface OptionItem<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

interface LearningOptionProps<T extends string = string> {
  label: string;
  options: OptionItem<T>[];
  value: T;
  onChange: (value: T) => void;
  layout?: "row" | "grid";
  helperText?: string;
}

export function LearningOption<T extends string = string>({
  label,
  options,
  value,
  onChange,
  layout = "row",
  helperText,
}: LearningOptionProps<T>) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </label>
        {helperText && (
          <span className="text-[11px] text-slate-400">{helperText}</span>
        )}
      </div>

      <div
        className={cn(
          layout === "grid"
            ? "grid grid-cols-2 sm:grid-cols-4 gap-2"
            : "flex flex-wrap gap-2"
        )}
      >
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-150 cursor-pointer select-none",
                isSelected
                  ? "border-indigo-600 bg-indigo-50/80 text-indigo-700 shadow-xs ring-1 ring-indigo-600/20 font-semibold"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              {opt.icon && <span className="shrink-0">{opt.icon}</span>}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
