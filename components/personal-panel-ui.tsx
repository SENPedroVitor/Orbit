"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { ArrowLeft, UsersRound } from "lucide-react";
import type { Workspace } from "@/lib/workspace";

export type WorkspaceChange = (updater: (workspace: Workspace) => Workspace) => void;
export const inputClass = "w-full min-h-11 rounded-[4px] border border-[var(--orbit-line,#E9E8E5)] bg-white px-3 py-2 text-sm text-[var(--orbit-ink,#37352F)] outline-none focus:border-[var(--orbit-accent,#2383E2)] focus:ring-2 focus:ring-[var(--orbit-accent,#2383E2)]/15";
export const primaryClass = "min-h-11 rounded-[4px] bg-[var(--orbit-accent,#2383E2)] px-3 text-white hover:bg-[var(--orbit-accent,#2383E2)]/90";
export const quietClass = "min-h-11 rounded-[4px] border border-[var(--orbit-line,#E9E8E5)] bg-white text-[var(--orbit-ink,#37352F)] hover:bg-[#F7F7F5]";

export function navigateTabs(event: KeyboardEvent<HTMLDivElement>) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const current = buttons.indexOf(event.target as HTMLButtonElement);
  if (current < 0 || buttons.length === 0) return;
  event.preventDefault();
  const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
  buttons[next].focus();
  buttons[next].click();
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="flex min-w-0 flex-col gap-2 text-xs text-[var(--orbit-muted,#787774)]"><span>{label}</span>{children}</label>;
}

export function PanelBack({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="mb-6 inline-flex min-h-11 items-center gap-2 text-xs text-[var(--orbit-muted,#787774)] hover:text-[var(--orbit-ink,#37352F)]"><ArrowLeft size={16} />{children}</button>;
}

export function PanelEmpty({ icon, title, children, action }: { icon?: ReactNode; title: string; children: ReactNode; action: ReactNode }) {
  return <div className="flex min-h-64 flex-col items-center justify-center gap-3 border-y border-[var(--orbit-line,#E9E8E5)] py-12 text-center"><div className="text-[var(--orbit-muted,#787774)]">{icon ?? <UsersRound size={30} strokeWidth={1.5} />}</div><h2 className="text-base font-semibold">{title}</h2><p className="max-w-sm text-sm leading-6 text-[var(--orbit-muted,#787774)]">{children}</p>{action}</div>;
}

export function displayDate(value: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" }) {
  if (!value) return "Não informado";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString("pt-BR", options) : "Não informado";
}

export function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function ageFromBirthday(birthday: string) {
  if (!birthday) return null;
  const now = new Date();
  const birth = new Date(`${birthday}T12:00:00`);
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate()) age--;
  return age >= 0 ? age : null;
}

export function lastContactLabel(date?: string) {
  if (!date) return "Sem contato registrado";
  const now = new Date();
  const day = new Date(date);
  const count = Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(day.getFullYear(), day.getMonth(), day.getDate())) / 86400000);
  return count === 0 ? "Hoje" : count === 1 ? "Ontem" : count > 1 ? `Há ${count} dias` : displayDate(date);
}
