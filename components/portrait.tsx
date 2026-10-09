"use client";

import { UserRound } from "lucide-react";

const crops = ["left-0 -top-2", "-left-[180px] -top-2", "-left-[360px] -top-2", "left-0 -top-[188px]", "-left-[180px] -top-[188px]", "-left-[360px] -top-[188px]"];

export function Portrait({ index, small = false }: { index: number | null; small?: boolean }) {
  if (index === null) return <div className={`flex items-center justify-center text-[var(--orbit-muted,#787774)] ${small ? "size-16 bg-[#F7F7F5]" : "h-[150px] w-full"}`}><UserRound size={small ? 26 : 40} strokeWidth={1.3} /></div>;
  return <div className={`relative flex items-start justify-center overflow-hidden bg-white ${small ? "size-16 shrink-0" : "h-[150px] w-full"}`}><div className={`h-[150px] w-[180px] shrink-0 overflow-hidden ${small ? "absolute -left-[6px] top-0 origin-top-left scale-[0.4267]" : "relative"}`}><img alt="" aria-hidden="true" src={`/design/retratos-0${Math.floor(index / 6) + 1}.png`} className={`absolute h-[360px] w-[540px] max-w-none ${crops[index % 6]}`} /></div></div>;
}
