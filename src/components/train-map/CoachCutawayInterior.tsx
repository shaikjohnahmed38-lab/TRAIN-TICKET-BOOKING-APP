import React from 'react';
import { Check, Lock } from 'lucide-react';
import { COACH_TEMPLATES, groupSeatsIntoBays } from '../../utils/coachLayouts';
import type { CoachSummary, Language, SeatRecord } from '../../types/railway';

interface CoachCutawayInteriorProps {
  coach: CoachSummary;
  seats: SeatRecord[];
  selectedSeatNumbers: number[];
  sessionId: string;
  onToggleSeat: (seat: SeatRecord) => void;
  language: Language;
}

const WashroomPlanSvg: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex flex-col items-center justify-center bg-slate-100 border border-slate-300 rounded p-1.5 min-w-[44px]">
    <svg width="28" height="24" viewBox="0 0 28 24" aria-hidden="true">
      {/* Commode top-down plan */}
      <rect x="2" y="4" width="6" height="16" rx="1" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
      <ellipse cx="14" cy="12" rx="6" ry="5" fill="#ffffff" stroke="#64748b" strokeWidth="1.2" />
      {/* Corner sink */}
      <rect x="21" y="2" width="5" height="6" rx="1" fill="#e0f2fe" stroke="#64748b" strokeWidth="0.9" />
    </svg>
    <span className="font-mono-tabular text-[8px] font-bold text-slate-600 leading-none mt-0.5">
      {label}
    </span>
  </div>
);

const DoorSwingSvg: React.FC<{ side: 'top' | 'bottom'; label: string }> = ({ side, label }) => (
  <div className="flex flex-col items-center gap-0.5">
    <svg width="30" height="24" viewBox="0 0 30 24" aria-hidden="true">
      {/* Stepwell tread */}
      <rect
        x="2"
        y={side === 'top' ? 0 : 19}
        width="26"
        height="5"
        fill="#94a3b8"
        stroke="#475569"
        strokeWidth="0.8"
      />
      {/* Architectural 90-deg door swing arc */}
      {side === 'top' ? (
        <>
          <line x1="6" y1="5" x2="6" y2="21" stroke="#1d4ed8" strokeWidth="2" />
          <path d="M6 21 A16 16 0 0 0 22 5" fill="none" stroke="#1d4ed8" strokeWidth="1" strokeDasharray="2 2" />
        </>
      ) : (
        <>
          <line x1="6" y1="19" x2="6" y2="3" stroke="#1d4ed8" strokeWidth="2" />
          <path d="M6 3 A16 16 0 0 1 22 19" fill="none" stroke="#1d4ed8" strokeWidth="1" strokeDasharray="2 2" />
        </>
      )}
    </svg>
    <span className="font-mono-tabular text-[8px] font-bold text-blue-800 whitespace-nowrap">
      {label}
    </span>
  </div>
);

export const CoachCutawayInterior: React.FC<CoachCutawayInteriorProps> = ({
  coach,
  seats,
  selectedSeatNumbers,
  sessionId,
  onToggleSeat,
  language,
}) => {
  const template = COACH_TEMPLATES[coach.coachType];
  const bays = groupSeatsIntoBays(coach.coachType, seats);
  const seatByNum = new Map<number, SeatRecord>(seats.map((s) => [s.seatNumber, s]));

  const renderBerthBunk = (
    seatNum: number,
    orientation: 'transverse' | 'longitudinal' | 'bench',
    pillowSide: 'left' | 'right' | 'top' | 'bottom' = 'top'
  ) => {
    const seat = seatByNum.get(seatNum);
    if (!seat) return null;

    const isSelected = selectedSeatNumbers.includes(seat.seatNumber);
    const isBooked = seat.status === 'BOOKED';
    const isHeldByOther = seat.status === 'HELD' && seat.heldBySession !== sessionId;
    const isHeldByMe = seat.status === 'HELD' && seat.heldBySession === sessionId;
    const isWaitlist = seat.status === 'WAITING_LIST';
    const isDisabled = isBooked || isHeldByOther;

    // Strict Status Colour Spec:
    // White = Available | Green = Booked | Yellow = Waiting List | Blue = Selected
    let frameClass =
      'bg-white border-slate-400 text-slate-900 hover:border-blue-600 hover:bg-blue-50/40';
    let pillowClass = 'bg-slate-200 border-slate-300';
    let statusTag = 'AVL';

    if (isSelected) {
      frameClass = 'bg-blue-600 border-blue-900 text-white shadow-sm ring-2 ring-blue-300';
      pillowClass = 'bg-blue-500 border-blue-300';
      statusTag = 'SEL';
    } else if (isBooked) {
      frameClass = 'bg-emerald-100 border-emerald-700 text-emerald-950 cursor-not-allowed';
      pillowClass = 'bg-emerald-200 border-emerald-400';
      statusTag = 'BKD';
    } else if (isHeldByOther) {
      frameClass = 'bg-slate-200 border-slate-400 text-slate-600 cursor-not-allowed';
      pillowClass = 'bg-slate-300 border-slate-400';
      statusTag = 'HLD';
    } else if (isWaitlist) {
      frameClass = 'bg-amber-100 border-amber-600 text-amber-950 hover:border-amber-800';
      pillowClass = 'bg-amber-200 border-amber-400';
      statusTag = 'WL';
    } else if (isHeldByMe) {
      frameClass = 'bg-blue-50 border-blue-500 text-blue-950';
      pillowClass = 'bg-blue-200 border-blue-300';
      statusTag = 'HLD';
    }

    const isLongitudinal = orientation === 'longitudinal';
    const isBench = orientation === 'bench';

    return (
      <button
        key={seat.seatNumber}
        type="button"
        disabled={isDisabled}
        onClick={() => onToggleSeat(seat)}
        data-testid={`seat-btn-${seat.seatNumber}`}
        data-seat-status={isSelected ? 'SELECTED' : seat.status}
        aria-label={`Coach ${coach.coachCode} Seat ${seat.seatNumber} ${seat.berthType} ${
          isSelected
            ? 'Selected'
            : isBooked
            ? 'Booked'
            : isHeldByOther
            ? 'Held'
            : isWaitlist
            ? 'Waiting List'
            : 'Available'
        }`}
        className={`relative border-[1.5px] rounded-[5px] transition-all select-none focus-visible:outline-2 focus-visible:outline-blue-700 overflow-hidden flex items-center justify-center ${
          isLongitudinal
            ? 'min-h-[40px] w-full px-2 py-1'
            : isBench
            ? 'min-h-[42px] w-full px-1 py-1'
            : 'min-h-[44px] w-full px-1 py-1'
        } ${frameClass}`}
      >
        {/* Top-Down Pillow Bolster / Bench Backrest Contour */}
        {!isBench && pillowSide === 'top' && (
          <span
            aria-hidden="true"
            className={`absolute top-0.5 inset-x-1.5 h-1.5 rounded-xs border ${pillowClass}`}
          />
        )}
        {!isBench && pillowSide === 'left' && (
          <span
            aria-hidden="true"
            className={`absolute left-0.5 inset-y-1.5 w-1.5 rounded-xs border ${pillowClass}`}
          />
        )}
        {!isBench && pillowSide === 'right' && (
          <span
            aria-hidden="true"
            className={`absolute right-0.5 inset-y-1.5 w-1.5 rounded-xs border ${pillowClass}`}
          />
        )}
        {isBench && (
          <span
            aria-hidden="true"
            className={`absolute inset-x-0.5 ${
              pillowSide === 'top' ? 'top-0' : 'bottom-0'
            } h-1.5 rounded-xs border ${pillowClass}`}
          />
        )}

        {/* Seat Number + Berth Type */}
        <div
          className={`flex items-center justify-center leading-none ${
            isLongitudinal ? 'flex-row gap-1.5' : 'flex-col gap-0.5 pt-1'
          }`}
        >
          <span className="font-mono-tabular text-[11px] font-extrabold flex items-center gap-0.5">
            {seat.seatNumber}
            {isSelected && <Check className="w-2.5 h-2.5 shrink-0" />}
            {isHeldByOther && <Lock className="w-2.5 h-2.5 shrink-0" />}
          </span>
          <span className="font-mono-tabular text-[8.5px] font-bold opacity-85">
            {seat.berthType}
            {isWaitlist ? '·WL' : isBooked ? '·OK' : statusTag === 'SEL' ? '' : ''}
          </span>
        </div>
      </button>
    );
  };

  const isSleeperOr3A = coach.coachType === 'SL' || coach.coachType === '3A';
  const is2A = coach.coachType === '2A';
  const is1A = coach.coachType === '1A';
  const isGS = coach.coachType === 'GS';

  const desktopGridCols = is1A
    ? 'lg:grid-cols-5'
    : isGS
    ? 'lg:grid-cols-6'
    : coach.coachType === 'SL'
    ? 'lg:grid-cols-9'
    : 'lg:grid-cols-8';

  return (
    <div
      data-testid={`coach-blueprint-${coach.coachType}`}
      className="relative bg-slate-800 p-1.5 sm:p-2 rounded-[26px] shadow-sm border-2 border-slate-900"
    >
      {/* Inner Insulated Metallic Coach Shell (Roof Completely Removed) */}
      <div className="bg-slate-200 rounded-[20px] border-2 border-slate-400 p-2 sm:p-3">
        {/* TOP OUTER WALL WINDOWS (Desktop Horizontal Architectural Cutaway) */}
        <div
          aria-hidden="true"
          className={`hidden lg:grid ${desktopGridCols} gap-2 px-24 mb-1.5`}
        >
          {bays.map((b) => (
            <div
              key={`win-top-${b.bayNumber}`}
              className="h-2.5 bg-sky-200 border-x-2 border-y border-slate-700 rounded-xs flex items-center justify-center"
            >
              <span className="text-[7px] font-mono-tabular font-bold text-sky-950 tracking-widest leading-none">
                WINDOW
              </span>
            </div>
          ))}
        </div>

        {/* MAIN FLOOR PLAN: VESTIBULE 1 + SALOON INTERIOR + VESTIBULE 2 */}
        <div className="flex flex-col lg:flex-row items-stretch gap-2">
          {/* LEFT / TOP END VESTIBULE: ENTRANCE DOORS + WASHROOMS + SALOON DOOR */}
          <div className="lg:w-24 bg-slate-100 border-2 border-slate-400 rounded-xl p-2 flex lg:flex-col items-center justify-between gap-2 shrink-0">
            <DoorSwingSvg side="top" label="ENTRY" />
            <div className="flex lg:flex-col items-center gap-1.5">
              <WashroomPlanSvg label="WC 1" />
              <div className="px-1.5 py-0.5 rounded bg-slate-800 text-white font-mono-tabular text-[9px] font-bold">
                {coach.coachCode}
              </div>
              <WashroomPlanSvg label="WC 2" />
            </div>
            <DoorSwingSvg side="bottom" label="EXIT" />
          </div>

          {/* SALOON PARTITION DOOR (Left) */}
          <div
            aria-hidden="true"
            className="hidden lg:flex w-2 flex-col items-center justify-between py-2"
          >
            <div className="w-1.5 flex-1 bg-slate-500 rounded-full" />
            <div className="w-2 h-10 border-2 border-blue-700 bg-sky-100 rounded-xs my-1" />
            <div className="w-1.5 flex-1 bg-slate-500 rounded-full" />
          </div>

          {/* PASSENGER SALOON FLOOR (ROOF REMOVED CUTAWAY) */}
          <div className="flex-1 bg-slate-50 border border-slate-300 rounded-xl p-2 sm:p-2.5 space-y-2">
            {/* TOP COMPARTMENT BAYS / CABINS / BENCHES */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${desktopGridCols} gap-2`}>
              {bays.map((bay) => (
                <div
                  key={bay.bayNumber}
                  className={`relative rounded-lg p-1.5 flex flex-col justify-between gap-1.5 ${
                    is1A
                      ? 'bg-amber-50/35 border-2 border-slate-700'
                      : 'bg-white border-x-2 border-t-2 border-slate-400'
                  }`}
                >
                  {/* Bay / Cabin Title & Window Table Strip */}
                  <div className="flex items-center justify-between gap-1 border-b border-slate-200 pb-1">
                    <span className="font-mono-tabular text-[9.5px] font-bold text-slate-700">
                      {bay.bayLabel}
                    </span>
                    {is1A ? (
                      <span className="font-mono-tabular text-[8px] font-bold text-blue-800">
                        CABIN DOOR
                      </span>
                    ) : (
                      <span
                        aria-hidden="true"
                        title="Window fold-out table"
                        className="w-7 h-2 rounded-xs bg-amber-200/80 border border-amber-400"
                      />
                    )}
                  </div>

                  {/* FACING BERTH STACKS OR BENCH SEATS */}
                  {isGS ? (
                    /* General Sitting: 3-seater benches facing across bay floor */
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-3 gap-1">
                        {bay.mainLeft.map((n) => renderBerthBunk(n, 'bench', 'top'))}
                      </div>
                      <div
                        aria-hidden="true"
                        className="h-2 bg-slate-100 rounded-xs border border-dashed border-slate-300"
                      />
                      <div className="grid grid-cols-3 gap-1">
                        {bay.mainRight.map((n) => renderBerthBunk(n, 'bench', 'bottom'))}
                      </div>
                    </div>
                  ) : (
                    /* Sleeper / 3A / 2A / 1A: Facing bunk stacks against left & right bay partitions */
                    <div className="grid grid-cols-[1fr_10px_1fr] items-stretch gap-0.5">
                      <div className="space-y-1">
                        {bay.mainLeft.map((n) => renderBerthBunk(n, 'transverse', 'top'))}
                      </div>

                      {/* Bay Floor Legroom Gap & Table Axis */}
                      <div
                        aria-hidden="true"
                        className="bg-slate-100/90 rounded-xs flex flex-col items-center justify-between py-1"
                      >
                        <span className="w-1.5 h-3 rounded-xs bg-amber-200 border border-amber-400" />
                        {is1A && (
                          <span className="w-2 h-2 rounded-full bg-sky-100 border border-slate-400" />
                        )}
                      </div>

                      <div className="space-y-1">
                        {bay.mainRight.map((n) => renderBerthBunk(n, 'transverse', 'top'))}
                      </div>
                    </div>
                  )}

                  {/* Privacy Curtain / Sliding Pocket Door Marker at Aisle Edge */}
                  {is2A && (
                    <div
                      aria-hidden="true"
                      className="h-1 border-b-2 border-dotted border-indigo-400 mx-1"
                      title="2A Privacy Curtain"
                    />
                  )}
                  {is1A && (
                    <div
                      aria-hidden="true"
                      className="h-1.5 bg-slate-700 rounded-full mx-3 flex items-center justify-center"
                    >
                      <span className="w-6 h-0.5 bg-amber-300 rounded-full" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* CENTRAL WALKING PASSAGE / CORRIDOR */}
            <div className="relative h-8 rounded-md bg-slate-200/85 border-y border-dashed border-slate-400 flex items-center justify-center sm:justify-between px-3 sm:px-5">
              <span className="font-mono-tabular text-[10px] font-bold tracking-wider sm:tracking-widest text-slate-700 truncate">
                ← {language === 'te' ? template.aisleLabelTe : template.aisleLabelEn}
              </span>
              <span className="hidden sm:inline font-mono-tabular text-[10px] font-semibold text-slate-600">
                {coach.coachCode} · {coach.coachType} WALKWAY
              </span>
              <span className="hidden sm:inline font-mono-tabular text-[10px] font-bold tracking-widest text-slate-700">
                {language === 'te' ? template.aisleLabelTe : template.aisleLabelEn} →
              </span>
            </div>

            {/* SIDE BERTHS (SL, 3A, 2A) OR LOWER 2-SEATER BENCHES (GS) */}
            {!is1A && (
              <div className={`grid grid-cols-1 sm:grid-cols-2 ${desktopGridCols} gap-2`}>
                {bays.map((bay) => (
                  <div
                    key={`side-${bay.bayNumber}`}
                    className="bg-white border-x-2 border-b-2 border-slate-400 rounded-lg p-1.5"
                  >
                    {isGS ? (
                      <div className="grid grid-cols-2 gap-1">
                        {bay.sideSeats.map((n) => renderBerthBunk(n, 'bench', 'bottom'))}
                      </div>
                    ) : (
                      /* Longitudinal Side Lower & Side Upper running parallel to bottom window */
                      <div className="space-y-1">
                        {bay.sideSeats[0] !== undefined &&
                          renderBerthBunk(bay.sideSeats[0], 'longitudinal', 'left')}
                        {bay.sideSeats[1] !== undefined &&
                          renderBerthBunk(bay.sideSeats[1], 'longitudinal', 'right')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Helper caption for 3-tier / 2-tier berth orientation */}
            {(isSleeperOr3A || is2A) && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono-tabular text-slate-500 pt-1">
                <span>
                  LB: Lower · {isSleeperOr3A ? 'MB: Middle · ' : ''}UB: Upper · SL: Side Lower · SU: Side Upper
                </span>
                <span>Pillow bolster indicates window headrest orientation</span>
              </div>
            )}
          </div>

          {/* SALOON PARTITION DOOR (Right) */}
          <div
            aria-hidden="true"
            className="hidden lg:flex w-2 flex-col items-center justify-between py-2"
          >
            <div className="w-1.5 flex-1 bg-slate-500 rounded-full" />
            <div className="w-2 h-10 border-2 border-blue-700 bg-sky-100 rounded-xs my-1" />
            <div className="w-1.5 flex-1 bg-slate-500 rounded-full" />
          </div>

          {/* RIGHT / BOTTOM END VESTIBULE: ENTRANCE DOORS + WASHROOMS */}
          <div className="lg:w-24 bg-slate-100 border-2 border-slate-400 rounded-xl p-2 flex lg:flex-col items-center justify-between gap-2 shrink-0">
            <DoorSwingSvg side="top" label="ENTRY" />
            <div className="flex lg:flex-col items-center gap-1.5">
              <WashroomPlanSvg label="WC 3" />
              <div className="px-1.5 py-0.5 rounded bg-slate-800 text-white font-mono-tabular text-[9px] font-bold">
                {coach.coachType}
              </div>
              <WashroomPlanSvg label="WC 4" />
            </div>
            <DoorSwingSvg side="bottom" label="EXIT" />
          </div>
        </div>

        {/* BOTTOM OUTER WALL WINDOWS (Desktop Horizontal Architectural Cutaway) */}
        <div
          aria-hidden="true"
          className={`hidden lg:grid ${desktopGridCols} gap-2 px-24 mt-1.5`}
        >
          {bays.map((b) => (
            <div
              key={`win-bot-${b.bayNumber}`}
              className="h-2.5 bg-sky-200 border-x-2 border-y border-slate-700 rounded-xs flex items-center justify-center"
            >
              <span className="text-[7px] font-mono-tabular font-bold text-sky-950 tracking-widest leading-none">
                WINDOW
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
