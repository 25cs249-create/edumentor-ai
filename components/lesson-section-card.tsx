import React from "react";
import { Clock, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LessonSectionData {
  step: number;
  title: string;
  duration: string;
  purpose: string;
  concepts?: string[];
}

interface LessonSectionCardProps {
  section: LessonSectionData;
  isActive?: boolean;
}

export function LessonSectionCard({
  section,
  isActive = false,
}: LessonSectionCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4.5 transition-all duration-200",
        isActive
          ? "border-indigo-300 bg-indigo-50/40 shadow-xs ring-1 ring-indigo-500/10"
          : "border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors",
              isActive
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-700"
            )}
          >
            {section.step}
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-900 leading-snug">
              {section.title}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {section.purpose}
            </p>

            {section.concepts && section.concepts.length > 0 && (
              <div className="pt-2 flex flex-wrap gap-1.5">
                {section.concepts.map((concept, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-100/90 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                  >
                    <Compass className="h-3 w-3 text-slate-400" />
                    {concept}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 rounded-md bg-slate-50 border border-slate-200/60 px-2.5 py-1 text-xs font-medium text-slate-500">
          <Clock className="h-3 w-3 text-slate-400" />
          <span>{section.duration}</span>
        </div>
      </div>
    </div>
  );
}
