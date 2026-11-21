import React from 'react';
import { ArrowRight, TrainFront } from 'lucide-react';
import type { CoachSummary, CoachType, Language, TrainSearchResult } from '../../types/railway';

interface CompleteTrainCutawayProps {
  train: TrainSearchResult;
  selectedCoachId: string;
  onSelectCoach: (coach: CoachSummary) => void;
  language: Language;
}

function renderMiniInteriorSilhouette(coachType: CoachType, isSelected: boolean) {
  const berthFill = isSelected ? 'rgba(255,255,255,0.85)' : '#cbd5e1';
  const aisleFill = isSelected ? 'rgba(30,64,175,0.45)' : '#e2e8f0';
  const wallStroke = isSelected ? 'rgba(255,255,255,0.5)' : '#94a3b8';

  if (coachType === '1A') {
    // 5 enclosed cabins + bottom side corridor
    return (
      <g>
        <rect x="18" y="42" width="132" height="10" fill={aisleFill} rx="1" />
        {[0, 1, 2, 3, 4].map((i) => {
          const x = 18 + i * 26.4;
          return (
            <g key={i}>
              <rect
                x={x + 1}
                y="12"
                width="24"
                height="28"
                fill="none"
                stroke={wallStroke}
                strokeWidth="1"
                rx="1"
              />
              <rect x={x + 3} y="14" width="7" height="24" fill={berthFill} rx="1" />
              {i !== 1 && (
                <rect x={x + 16} y="14" width="7" height="24" fill={berthFill} rx="1" />
              )}
            </g>
          );
        })}
      </g>
    );
  }

  if (coachType === 'GS') {
    // Bench seating zones + wide central walkway
    return (
      <g>
        <rect x="18" y="27" width="132" height="10" fill={aisleFill} rx="1" />
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const x = 19 + i * 21.8;
          return (
            <g key={i}>
              <rect x={x} y="12" width="8" height="13" fill={berthFill} rx="1" />
              <rect x={x + 11} y="12" width="8" height="13" fill={berthFill} rx="1" />
              <rect x={x} y="39" width="8" height="13" fill={berthFill} rx="1" />
              <rect x={x + 11} y="39" width="8" height="13" fill={berthFill} rx="1" />
            </g>
          );
        })}
      </g>
    );
  }

  // SL / 3A / 2A: bays on top, aisle in middle, longitudinal side berths below
  const bayCount = coachType === 'SL' ? 9 : 8;
  const bayWidth = 132 / bayCount;
  return (
    <g>
      <rect x="18" y="34" width="132" height="7" fill={aisleFill} rx="1" />
      {Array.from({ length: bayCount }).map((_, i) => {
        const x = 18 + i * bayWidth;
        return (
          <g key={i}>
            <line
              x1={x}
              y1="11"
              x2={x}
              y2="34"
              stroke={wallStroke}
              strokeWidth="0.8"
            />
            <rect
              x={x + 1.5}
              y="13"
              width={Math.max(3, bayWidth * 0.34)}
              height="19"
              fill={berthFill}
              rx="1"
            />
            <rect
              x={x + bayWidth - Math.max(3, bayWidth * 0.34) - 1.5}
              y="13"
              width={Math.max(3, bayWidth * 0.34)}
              height="19"
              fill={berthFill}
              rx="1"
            />
            <rect
              x={x + 1.5}
              y="43"
              width={bayWidth - 3}
              height="8"
              fill={berthFill}
              rx="1"
            />
          </g>
        );
      })}
    </g>
  );
}

export const CompleteTrainCutaway: React.FC<CompleteTrainCutawayProps> = ({
  train,
  selectedCoachId,
  onSelectCoach,
  language,
}) => {
  return (
    <section
      data-testid="complete-train-cutaway"
      className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <TrainFront className="w-5 h-5 text-blue-700" />
            <span>
              {language === 'te'
                ? '1. పూర్తి రైలు టాప్-డౌన్ కట్‌అవే వీక్షణ'
                : '1. Complete Train Top-Down Cutaway View'}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            {language === 'te'
              ? 'పైకప్పు తీసివేసిన లోపలి సీట్ల అమరికను చూడటానికి ఏదైనా కోచ్‌పై నొక్కండి.'
              : 'Select any passenger coach below to remove its roof and open the detailed 2D interior floor plan.'}
          </p>
        </div>

        <span className="font-mono-tabular text-xs font-semibold text-slate-600">
          WAP-7 Loco + {train.coaches.length} LHB Coaches
        </span>
      </div>

      {/* Scrollable Top-Down Railway Track & Full Train Formation */}
      <div className="rail-scroll overflow-x-auto pb-3">
        <div className="relative inline-flex items-center min-w-max px-4 py-6 bg-slate-100/80 border border-slate-200 rounded-xl">
          {/* Top-Down Ballast & Sleepers + Dual Steel Rails */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-24 pointer-events-none"
          >
            {/* Concrete sleepers */}
            <div className="w-full h-full bg-[repeating-linear-gradient(90deg,transparent_0px,transparent_14px,#cbd5e1_14px,#cbd5e1_20px)] opacity-75" />
            {/* Upper & Lower Steel Rails */}
            <div className="absolute top-3 left-0 right-0 h-1 bg-slate-500" />
            <div className="absolute bottom-3 left-0 right-0 h-1 bg-slate-500" />
          </div>

          {/* TOP-DOWN LOCOMOTIVE (WAP-7) */}
          <div
            data-testid="train-engine"
            className="relative z-10 shrink-0 mr-1 flex flex-col items-center"
          >
            <svg
              width="196"
              height="92"
              viewBox="0 0 196 92"
              aria-label="WAP-7 Electric Locomotive top-down view"
              className="drop-shadow-sm"
            >
              {/* Front buffer beam & coupler */}
              <rect x="2" y="38" width="8" height="16" fill="#334155" rx="1" />
              <rect x="8" y="20" width="4" height="52" fill="#1e293b" rx="1" />
              {/* Tapered aerodynamic body shell */}
              <path
                d="M12 18 L34 10 L182 10 L190 18 L190 74 L182 82 L34 82 L12 74 Z"
                fill="#0f172a"
                stroke="#334155"
                strokeWidth="2"
              />
              {/* Front & rear cab windshields */}
              <path d="M22 22 L32 16 L32 76 L22 70 Z" fill="#bae6fd" stroke="#475569" />
              <rect x="172" y="16" width="8" height="60" fill="#bae6fd" stroke="#475569" rx="1" />
              {/* Cutaway Cab seats */}
              <rect x="38" y="22" width="12" height="14" fill="#334155" rx="2" />
              <rect x="38" y="56" width="12" height="14" fill="#334155" rx="2" />
              {/* Central Engine Cutaway Bay (Transformer & Cooling Fans) */}
              <rect
                x="56"
                y="18"
                width="106"
                height="56"
                fill="#1e293b"
                stroke="#475569"
                strokeWidth="1.2"
                rx="3"
              />
              {/* Twin Cooling Fan Units */}
              <circle cx="84" cy="46" r="14" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
              <path d="M74 46 L94 46 M84 36 L84 56" stroke="#94a3b8" strokeWidth="1.5" />
              <circle cx="122" cy="46" r="14" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
              <path d="M112 46 L132 46 M122 36 L122 56" stroke="#94a3b8" strokeWidth="1.5" />
              {/* Pantograph Diamond Frame */}
              <path
                d="M142 32 L154 22 L166 32 L154 42 Z"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.6"
              />
              <path
                d="M142 60 L154 50 L166 60 L154 70 Z"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.6"
              />
              {/* Locomotive Label */}
              <text
                x="108"
                y="27"
                textAnchor="middle"
                fill="#e2e8f0"
                fontSize="8.5"
                fontWeight="700"
                fontFamily="JetBrains Mono, monospace"
              >
                WAP-7 ENGINE
              </text>
              {/* Rear coupler */}
              <rect x="190" y="34" width="6" height="24" fill="#475569" rx="1" />
            </svg>
            <span className="mt-1.5 text-[11px] font-mono-tabular font-bold text-slate-700">
              LOCOMOTIVE
            </span>
          </div>

          {/* CONNECTED PASSENGER COACHES */}
          {train.coaches.map((coach) => {
            const isSelected = coach.id === selectedCoachId;
            return (
              <div key={coach.id} className="relative z-10 flex items-center shrink-0">
                {/* Ribbed Accordion Vestibule Gangway Connector */}
                <div
                  aria-hidden="true"
                  className="w-4 h-10 bg-slate-700 border-y-2 border-slate-800 flex items-center justify-around px-0.5 mb-7"
                >
                  <span className="w-0.5 h-8 bg-slate-500" />
                  <span className="w-0.5 h-8 bg-slate-500" />
                </div>

                <button
                  type="button"
                  onClick={() => onSelectCoach(coach)}
                  data-testid={`coach-card-${coach.coachCode}`}
                  aria-label={`Select Coach ${coach.coachCode} ${coach.coachType}, ${coach.availableCount} available, Demo fare ${coach.fare} rupees`}
                  className="group flex flex-col items-center focus-visible:outline-2 focus-visible:outline-blue-700 rounded-xl p-1"
                >
                  {/* Top-Down Roof-Removed Miniature Coach SVG */}
                  <svg
                    width="172"
                    height="92"
                    viewBox="0 0 168 64"
                    className={`transition-transform duration-150 group-hover:-translate-y-1 ${
                      isSelected ? 'drop-shadow-md' : 'drop-shadow-xs'
                    }`}
                  >
                    {/* Outer Coach Hull (Chamfered Ends) */}
                    <path
                      d="M4 12 L10 5 L158 5 L164 12 L164 52 L158 59 L10 59 L4 52 Z"
                      fill={isSelected ? '#1d4ed8' : '#ffffff'}
                      stroke={isSelected ? '#1e3a8a' : '#334155'}
                      strokeWidth="2.2"
                    />
                    {/* Interior Floor Base */}
                    <rect
                      x="16"
                      y="9"
                      width="136"
                      height="46"
                      fill={isSelected ? '#1e40af' : '#f8fafc'}
                      rx="1"
                    />
                    {/* End Vestibules & Washroom Blocks */}
                    <rect
                      x="7"
                      y="10"
                      width="9"
                      height="44"
                      fill={isSelected ? '#1e3a8a' : '#e2e8f0'}
                    />
                    <rect
                      x="152"
                      y="10"
                      width="9"
                      height="44"
                      fill={isSelected ? '#1e3a8a' : '#e2e8f0'}
                    />
                    {/* Top & Bottom Side Windows */}
                    {[0, 1, 2, 3, 4, 5, 6].map((w) => (
                      <g key={w}>
                        <rect
                          x={22 + w * 18.5}
                          y="4.5"
                          width="12"
                          height="2.5"
                          fill="#7dd3fc"
                          rx="0.5"
                        />
                        <rect
                          x={22 + w * 18.5}
                          y="57"
                          width="12"
                          height="2.5"
                          fill="#7dd3fc"
                          rx="0.5"
                        />
                      </g>
                    ))}
                    {/* Doors on Left & Right Vestibules */}
                    <rect x="8" y="4" width="6" height="2" fill="#2563eb" />
                    <rect x="8" y="58" width="6" height="2" fill="#2563eb" />
                    <rect x="154" y="4" width="6" height="2" fill="#2563eb" />
                    <rect x="154" y="58" width="6" height="2" fill="#2563eb" />

                    {/* Coach-Type Specific Top-Down Interior Silhouette */}
                    {renderMiniInteriorSilhouette(coach.coachType, isSelected)}
                  </svg>

                  {/* Coach Metadata Label Under Coach */}
                  <div
                    className={`mt-1.5 w-full px-2.5 py-1.5 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? 'bg-blue-700 border-blue-800 text-white'
                        : 'bg-white border-slate-200 text-slate-900 group-hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono-tabular text-xs font-extrabold">
                        {coach.coachCode} · {coach.coachType}
                      </span>
                      <span className="font-mono-tabular text-xs font-bold">
                        ₹{coach.fare}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1 text-[10px] font-mono-tabular mt-0.5">
                      <span
                        className={
                          isSelected ? 'text-blue-100 font-semibold' : 'text-emerald-700 font-semibold'
                        }
                      >
                        {coach.availableCount} AVL
                      </span>
                      <span
                        className={`inline-flex items-center gap-0.5 font-sans font-semibold ${
                          isSelected ? 'text-white' : 'text-blue-700'
                        }`}
                      >
                        Open <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
