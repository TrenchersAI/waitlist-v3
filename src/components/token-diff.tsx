"use client";

import Image from "next/image";

function TinyIcon({ label }: { label: string }) {
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-[4px] border border-[#1f1f1f] bg-[#0f0f0f] text-[9px] font-medium text-[#8f8f8f]">
      {label}
    </span>
  );
}

function StatPill({ icon, value }: { icon: string; value: string }) {
  return (
    <div className="flex items-center gap-1">
      <TinyIcon label={icon} />
      <span className="text-sm font-medium text-[#12af80]">{value}</span>
    </div>
  );
}

export default function TokenDiff() {
  return (
    <div className="w-full max-w-[470px] border-b border-[#303030] px-2 pb-4">
      <div className="flex items-center gap-3">
        <div className="flex w-[72px] shrink-0 flex-col items-center gap-1">
          <div className="w-full rounded-[4px] border border-[#12af80] p-[2px]">
            <div className="relative h-[68px] w-full overflow-hidden rounded-[2px]">
              <Image
                src="/token-4.svg"
                alt="Token preview"
                fill
                className="object-cover"
              />
            </div>
          </div>
          <span className="text-[11px] font-medium text-[#4c4c4c]">Hqh1...pump</span>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-between gap-5">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base font-medium text-white">Drill</span>
                <div className="flex items-center gap-1">
                  <span className="text-base font-medium text-[#454545]">
                    Trump frog
                  </span>
                  <span className="text-xs text-[#454545]">⧉</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-[#12af80]">7s</span>
                <TinyIcon label="P" />
                <TinyIcon label="W" />
                <div className="flex items-center gap-1">
                  <TinyIcon label="A" />
                  <span className="text-sm font-medium text-white">2</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <StatPill icon="↗" value="4%" />
              <StatPill icon="◔" value="5%" />
              <StatPill icon="👁" value="5%" />
              <StatPill icon="♨" value="5%" />
              <StatPill icon="🏆" value="5%" />
            </div>
          </div>

          <div className="flex w-[92px] shrink-0 flex-col items-end gap-2">
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-[#545454]">MC</span>
                <span className="text-base font-medium text-white">$2.40k</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-[#545454]">V</span>
                <span className="text-base font-medium text-white">$3</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[11px] font-medium">
                  <span className="text-[#545454]">TX</span>
                  <span className="text-white">3</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-medium">
                  <span className="text-[#545454]">F</span>
                  <span className="text-white">◎ 0.344</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="rounded-md bg-gradient-to-b from-[#0077ff] to-[#003faf] px-[10px] py-1 text-xs font-medium text-white"
            >
              ⚡ 0 SOL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
