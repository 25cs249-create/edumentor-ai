import React from "react";
import {
  Activity,
  Layers,
  ArrowRight,
  TrendingUp,
  Cpu,
  Calendar,
  Sparkles,
} from "lucide-react";

export type VisualType =
  | "diagram"
  | "equation"
  | "graph"
  | "example"
  | "code"
  | "timeline"
  | string;

interface VisualExplanationProps {
  type?: VisualType;
  title?: string;
  description?: string;
}

export function VisualExplanation({
  type = "diagram",
  title = "Inertia & Motion Vectors",
  description = "A split visualization depicting balanced horizontal and vertical forces on an object at constant velocity.",
}: VisualExplanationProps) {
  const normalizedType = type.toLowerCase();

  const renderVisualContent = () => {
    if (normalizedType.includes("graph")) {
      return (
        <div className="flex h-44 w-full flex-col items-center justify-center rounded-xl bg-slate-50 p-4 border border-slate-200/60">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-2">
            <TrendingUp className="h-4 w-4 text-indigo-600" />
            <span>Velocity vs. Time (v-t Graph)</span>
          </div>
          <div className="relative w-full max-w-xs h-28 border-l-2 border-b-2 border-slate-400 flex items-center justify-center">
            {/* Constant velocity line */}
            <div className="absolute top-8 left-0 right-4 h-0.5 bg-indigo-600">
              <span className="absolute -top-4 right-2 text-[10px] font-mono font-bold text-indigo-700">
                v = constant (a = 0)
              </span>
            </div>
            <div className="absolute -left-6 top-8 text-[10px] font-mono text-slate-500 font-bold">
              v₀
            </div>
            <div className="absolute -bottom-5 right-0 text-[10px] font-mono text-slate-500 font-bold">
              time (t)
            </div>
          </div>
        </div>
      );
    }

    if (normalizedType.includes("equation") || normalizedType.includes("formula")) {
      return (
        <div className="flex h-44 w-full flex-col items-center justify-center rounded-xl bg-indigo-50/50 p-4 border border-indigo-100 text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 mb-2">
            Governing Dynamic Formula
          </span>
          <div className="rounded-xl bg-white px-6 py-3 shadow-xs border border-indigo-200/70 font-mono text-xl font-extrabold text-slate-900 tracking-wider">
            F<span className="text-xs align-sub text-slate-500">net</span> = m · a
          </div>
          <p className="mt-3 text-xs text-slate-600 font-medium">
            Where <span className="font-semibold text-indigo-700">F</span> = Net External Force, <span className="font-semibold text-indigo-700">m</span> = Mass, <span className="font-semibold text-indigo-700">a</span> = Acceleration
          </p>
        </div>
      );
    }

    if (normalizedType.includes("code")) {
      return (
        <div className="flex h-44 w-full flex-col rounded-xl bg-slate-900 p-3.5 border border-slate-800 font-mono text-xs text-slate-200 overflow-hidden">
          <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-slate-800 text-slate-400 text-[11px]">
            <Cpu className="h-3.5 w-3.5 text-indigo-400" />
            <span>physics_engine.ts</span>
          </div>
          <p className="text-indigo-400">const applyForce = (mass: number, force: number) =&gt; &#123;</p>
          <p className="pl-4 text-emerald-400">const acceleration = force / mass; // Newton 2nd Law</p>
          <p className="pl-4 text-slate-300">return &#123; acceleration, velocity: prevV + acceleration * dt &#125;;</p>
          <p className="text-indigo-400">&#125;;</p>
        </div>
      );
    }

    if (normalizedType.includes("timeline") || normalizedType.includes("sequence")) {
      return (
        <div className="flex h-44 w-full flex-col items-center justify-center rounded-xl bg-slate-50 p-4 border border-slate-200/60">
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-700 mb-3">
            <Calendar className="h-4 w-4 text-indigo-600" />
            <span>Event Chronology</span>
          </div>
          <div className="flex items-center gap-2 w-full max-w-sm justify-between">
            <div className="flex flex-col items-center text-center">
              <span className="h-6 w-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">1</span>
              <span className="text-[11px] font-semibold text-slate-800 mt-1">Steady Motion</span>
              <span className="text-[10px] text-slate-500">v = constant</span>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
            <div className="flex flex-col items-center text-center">
              <span className="h-6 w-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">2</span>
              <span className="text-[11px] font-semibold text-slate-800 mt-1">Brakes Applied</span>
              <span className="text-[10px] text-slate-500">External Force</span>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
            <div className="flex flex-col items-center text-center">
              <span className="h-6 w-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">3</span>
              <span className="text-[11px] font-semibold text-slate-800 mt-1">Inertia Lurch</span>
              <span className="text-[10px] text-slate-500">Body Continues</span>
            </div>
          </div>
        </div>
      );
    }

    // Default: diagram / motion diagram / force diagram
    return (
      <div className="relative flex h-44 w-full flex-col items-center justify-center rounded-xl bg-slate-50/80 p-4 border border-slate-200/70 overflow-hidden">
        {/* Force vectors diagram */}
        <div className="relative flex items-center justify-center w-full max-w-xs">
          {/* Ground */}
          <div className="absolute bottom-0 w-full h-1 bg-slate-300 rounded-full" />

          {/* Center object */}
          <div className="relative z-10 flex h-16 w-24 flex-col items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-sm">
            <span>Mass (m)</span>
            <span className="text-[9px] text-indigo-200 font-mono">v = 25 m/s</span>
          </div>

          {/* Normal Force Vector (Up) */}
          <div className="absolute -top-7 flex flex-col items-center">
            <span className="text-[10px] font-bold text-emerald-600 font-mono">F_normal ↑</span>
            <div className="w-0.5 h-4 bg-emerald-500" />
          </div>

          {/* Gravity Vector (Down) */}
          <div className="absolute -bottom-8 flex flex-col items-center">
            <div className="w-0.5 h-4 bg-slate-500" />
            <span className="text-[10px] font-bold text-slate-600 font-mono">↓ F_gravity</span>
          </div>

          {/* Velocity arrow to the right */}
          <div className="absolute right-0 flex items-center">
            <div className="h-0.5 w-12 bg-indigo-600" />
            <ArrowRight className="h-4 w-4 text-indigo-600 -ml-1.5" />
            <span className="text-[10px] font-bold text-indigo-700 ml-1 font-mono">v →</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs min-h-[280px]">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Layers className="h-3.5 w-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Visual Explanation
              </h3>
              <span className="text-[10px] font-medium text-slate-400 capitalize">
                Type: {type}
              </span>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
            <Activity className="h-3 w-3 text-indigo-500" />
            {title}
          </span>
        </div>

        {/* Dynamic / Interactive Visual Canvas */}
        <div className="mt-3.5">{renderVisualContent()}</div>
      </div>

      {/* Caption description */}
      <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 p-2.5 border border-slate-200/60 text-xs text-slate-600 leading-relaxed">
        <Sparkles className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
        <span className="text-[11px] font-medium">{description}</span>
      </div>
    </div>
  );
}
