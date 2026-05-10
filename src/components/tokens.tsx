"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import clsx from "clsx";
import DevHoldingIcon from "./icons/dev-holding-icon";
import HoldersIcon from "./icons/holders-icon";
import KolsIcon from "./icons/kols-icon";
import ProTradersIcon from "./icons/pro-traders";
import PumpFunIcon from "./icons/pump-fun-icon";
import WebsiteIcon from "./icons/website-icon";

export const NFTData = [
  {
    name: "Hypurr",
    avatar: "/token-1.svg",
    value: "$13.7k",
    change: "+1%",
    changeType: "positive",
  },
  {
    name: "bossoskil",
    avatar: "/token-2.svg",
    value: "$13.7k",
    change: "+1%",
    changeType: "positive",
  },
  {
    name: "fwogs",
    avatar: "/token-3.svg",
    value: "$13.7k",
    change: "+1%",
    changeType: "positive",
  },
];

export interface NFTDatatype {
  name: string;
  avatar: string;
  value: string;
  change: string;
  index: number;
}

interface TokenListProps {
  className?: string;
}

export default function TokenList({ className }: TokenListProps) {
  const [toasts, setToasts] = useState<typeof NFTData>([]);

  useEffect(() => {
    setToasts([NFTData[0]]);

    const id = setInterval(() => {
      setToasts((prev) => {
        const nextIndex = prev.length % NFTData.length;
        return [...prev, NFTData[nextIndex]];
      });
    }, 1600);

    return () => clearInterval(id);
  }, []);

  return (
    <div
      className={clsx(
        "w-full flex items-center justify-center h-full",
        className,
      )}
    >
      <div className="flex relative h-[240px] overflow-hidden flex-col w-full items-center justify-center gap-2 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-12 before:bg-gradient-to-b before:from-black before:to-transparent after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:z-10 after:h-12 after:bg-gradient-to-t after:from-black after:to-transparent">
        {toasts.map((data, idx) => (
          <NFT key={idx} {...data} index={toasts.length - (idx + 1)} />
        ))}
      </div>
    </div>
  );
}

function NFT({ name, avatar, value, change, index }: NFTDatatype) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      data-mounted={mounted}
      style={
        {
          "--gap": "8px",
          "--index": index,
          transform: mounted
            ? "translateY(calc(var(--index) * (100% + var(--gap)) * -1))"
            : "translateY(100%)",
          opacity: mounted ? 1 : 0,
        } as React.CSSProperties
      }
      className="absolute bottom-16 w-full max-w-[400px] opacity-0 translate-y-full transition-[transform,opacity] duration-[400ms] ease-in-out"
    >
      <div className="rounded-xl bg-linear-to-tl from-white/8 via-white/1 to-transparent p-px">
        <div className="rounded-[12px] bg-linear-to-br from-white/16 via-white/8 to-transparent p-px">
          <div
            className="
              flex items-center justify-between gap-1
              rounded-[11px] bg-[#0F1010]
              px-[14px] pt-[10px] pb-[13px] text-[13px]
              shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)]
            "
          >
            <div className="flex items-center justify-center gap-2">
              <Image
                src={avatar}
                width={40}
                height={40}
                className="rounded-lg"
                alt="NFTs image"
              />
              <div className="flex flex-col gap-2">
                <div className="flex justify-start items-center gap-1.5">
                  <span className="text-white text-sm">{name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <IconStripItem icon={<PumpFunIcon />} value="5%" />
                  <IconStripItem icon={<WebsiteIcon />} value="5%" />
                  <IconStripItem icon={<DevHoldingIcon />} value="4%" />
                  <IconStripItem icon={<HoldersIcon />} value="5%" />
                  <IconStripItem icon={<KolsIcon />} value="5%" />
                  {/* <IconStripItem icon={<ProTradersIcon />} value="5%" /> */}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 text-xs text-white">
              <span className="text-white">{value}</span>
              {/* <span className="text-green-600">{change}</span> */}
              <button
                type="button"
                className="mt-1 inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-[6px] px-[6px] py-[4px] text-white"
                style={{
                  background:
                    "linear-gradient(0deg, rgba(0, 0, 0, 0.20) 0%, rgba(0, 0, 0, 0.20) 100%), linear-gradient(180deg, #07F 0%, #003FAF 100%)",
                }}
              >
                <span>⚡</span>
                <span>0 SOL</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconStripItem({
  icon,
  value,
}: {
  icon: React.ReactNode;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1">
      {icon}
      <span className="text-neutral-300">{value}</span>
    </div>
  );
}
