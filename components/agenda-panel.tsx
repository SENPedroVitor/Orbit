"use client";

import { useMemo, useState } from "react";
import { Bell, CalendarDays, Check, ChevronLeft, ChevronRight, Circle, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { areas, type Task } from "@/lib/workspace";
import { repeatLabels } from "@/lib/schedule";

export interface AgendaPanelProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onCreateTask: (date?: string) => void;
  onFinishTask: (task: Task) => void;
  onEnableNotifications: () => void;
}

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const mobileWeekDays = ["S", "T", "Q", "Q", "S", "S", "D"];
const areaColor: Record<Task["area"], { background: string; text: string }> = {
  Pessoal: { background: "#F6E5EF", text: "#995174" },
  Estudos: { background: "#E5F0E8", text: "#48774E" },
  Trabalho: { background: "#FAEED6", text: "#9A7736" },
  Programação: { background: "#E7EDFA", text: "#5267A6" },
};
const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orbit-accent,#2383e2)] focus-visible:ring-offset-2";

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dayDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

function eventDate(task: Task): string {
  if (task.scheduledAt) {
    const scheduled = new Date(task.scheduledAt);
    if (Number.isFinite(scheduled.getTime())) return dateKey(scheduled);
  }
  return task.due || "";
}

function eventTime(task: Task): string {
  return task.scheduledAt ? new Date(task.scheduledAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "Sem horário";
}

function taskOrder(first: Task, second: Task): number {
  const firstTime = first.scheduledAt ? new Date(first.scheduledAt).getTime() : dayDate(first.due).getTime();
  const secondTime = second.scheduledAt ? new Date(second.scheduledAt).getTime() : dayDate(second.due).getTime();
  return firstTime - secondTime || first.title.localeCompare(second.title, "pt-BR");
}

function TaskEvent({ task, onFinishTask, onEditTask }: { task: Task; onFinishTask: AgendaPanelProps["onFinishTask"]; onEditTask: AgendaPanelProps["onEditTask"] }) {
  const color = areaColor[task.area];
  const completed = task.status === "Concluído";
  return <li className="flex min-h-20 items-center gap-2 rounded-[5px] px-3 py-2" style={{ background: color.background }}>
    <button type="button" onClick={() => onFinishTask(task)} aria-label={`${completed ? "Reabrir" : "Concluir"} tarefa ${task.title}`} aria-pressed={completed} className={`flex min-h-11 w-11 shrink-0 items-center justify-center rounded ${focus}`} style={{ color: color.text }}>
      {completed ? <Check size={19} /> : <Circle size={18} />}
    </button>
    <button type="button" onClick={() => onEditTask(task)} className={`flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded text-left ${focus}`}>
      <span className="w-14 shrink-0 text-xs tabular-nums text-[var(--orbit-muted,#787774)]">{eventTime(task)}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className={`break-words text-[13px] font-medium ${completed ? "line-through opacity-60" : ""}`}>{task.title}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--orbit-muted,#787774)]">
          <span>{task.area}</span>
          {task.reminder && task.scheduledAt && <span className="inline-flex items-center gap-1"><Bell size={12} />Lembrete ativado</span>}
          {task.repeat && task.repeat !== "none" && <span>{repeatLabels[task.repeat]}</span>}
          {completed && <span>Concluída</span>}
        </span>
      </span>
    </button>
  </li>;
}

export function AgendaPanel({ tasks, onEditTask, onCreateTask, onFinishTask, onEnableNotifications }: AgendaPanelProps) {
  const [selectedDay, setSelectedDay] = useState(() => dateKey(new Date()));
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12));
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [area, setArea] = useState("Todas");
  const [pendingOnly, setPendingOnly] = useState(false);
  const today = dateKey(new Date());
  const selectedDate = dayDate(selectedDay);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const events = useMemo(() => tasks.filter(task => eventDate(task) && (area === "Todas" || task.area === area) && (!pendingOnly || task.status !== "Concluído")).sort(taskOrder), [tasks, area, pendingOnly]);
  const eventsByDay = useMemo(() => {
    const groups = new Map<string, Task[]>();
    for (const task of events) {
      const key = eventDate(task);
      const group = groups.get(key) ?? [];
      group.push(task);
      groups.set(key, group);
    }
    return groups;
  }, [events]);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const totalCells = Math.ceil((month.getDay() + daysInMonth) / 7) * 7;
  const calendarDays = Array.from({ length: totalCells }, (_, index) => new Date(month.getFullYear(), month.getMonth(), 1 - month.getDay() + index, 12));
  const weekStart = new Date(selectedDate);
  weekStart.setDate(selectedDate.getDate() - (selectedDate.getDay() + 6) % 7);
  const week = Array.from({ length: 7 }, (_, index) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index, 12));
  const monthPrefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-`;
  const monthGroups = [...eventsByDay.entries()].filter(([key]) => key.startsWith(monthPrefix)).sort(([a], [b]) => a.localeCompare(b));
  const dayTasks = eventsByDay.get(selectedDay) ?? [];

  function selectDay(value: string) {
    setSelectedDay(value);
    const date = dayDate(value);
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1, 12));
  }

  function moveMonth(offset: number) {
    const nextMonth = new Date(month.getFullYear(), month.getMonth() + offset, 1, 12);
    const nextDay = Math.min(selectedDate.getDate(), new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate());
    setMonth(nextMonth);
    setSelectedDay(dateKey(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), nextDay, 12)));
  }

  function moveWeek(offset: number) {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + offset * 7);
    selectDay(dateKey(next));
  }

  return <section className="text-[var(--orbit-ink,#37352f)]" aria-label="Agenda">
    <header className="mb-5 flex flex-col gap-3 md:mb-6">
      <CalendarDays className="hidden text-[var(--orbit-muted,#787774)] md:block" size={38} strokeWidth={1.4} aria-hidden="true" />
      <h1 className="text-[27px] font-bold leading-tight tracking-[-0.025em] md:text-4xl">Agenda</h1>
      <p className="hidden text-sm leading-relaxed text-[var(--orbit-muted,#787774)] md:block">Um pouco de espaço para organizar seu tempo.</p>
      <p className="text-sm leading-relaxed text-[var(--orbit-muted,#787774)] md:hidden">{selectedDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
    </header>

    <div className="hidden min-h-10 items-center justify-between gap-4 border-b border-[var(--orbit-line,#e9e8e5)] md:flex">
      <div className="flex items-center gap-5" aria-label="Visualização da agenda">
        {([{ key: "calendar", label: "Calendário", icon: CalendarDays }, { key: "list", label: "Lista", icon: List }] as const).map(tab => <button key={tab.key} type="button" onClick={() => setView(tab.key)} aria-pressed={view === tab.key} className={`-mb-px flex min-h-10 items-center gap-2 border-b-2 text-[13px] ${focus} ${view === tab.key ? "border-[var(--orbit-ink,#37352f)] font-medium" : "border-transparent text-[var(--orbit-muted,#787774)]"}`}><tab.icon size={15} />{tab.label}</button>)}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 pb-1">
        <select value={area} onChange={event => setArea(event.target.value)} aria-label="Filtrar agenda por espaço" className={`h-8 max-w-32 rounded bg-transparent px-2 text-xs text-[var(--orbit-muted,#787774)] ${focus}`}>
          <option value="Todas">Todos os espaços</option>{areas.map(value => <option key={value}>{value}</option>)}
        </select>
        <Button variant="ghost" size="sm" onClick={() => setPendingOnly(value => !value)} aria-pressed={pendingOnly} className="text-xs text-[var(--orbit-muted,#787774)]">{pendingOnly ? "Pendentes" : "Todas as tarefas"}</Button>
        <Button variant="ghost" size="icon-sm" onClick={onEnableNotifications} aria-label="Ativar notificações da agenda"><Bell size={15} /></Button>
        <Button size="sm" onClick={() => onCreateTask(selectedDay)} className="rounded bg-[var(--orbit-accent,#2383e2)] text-xs text-white hover:bg-[#1c71c7]">Agendar tarefa</Button>
      </div>
    </div>

    <div className="mt-5 hidden items-center justify-between gap-3 md:flex">
      <h2 className="text-[19px] font-semibold capitalize">{month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</h2>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" className="h-8 rounded text-xs shadow-none" onClick={() => selectDay(today)}>Hoje</Button>
        <Button variant="ghost" size="icon-sm" onClick={() => moveMonth(-1)} aria-label="Mês anterior"><ChevronLeft size={16} /></Button>
        <Button variant="ghost" size="icon-sm" onClick={() => moveMonth(1)} aria-label="Próximo mês"><ChevronRight size={16} /></Button>
      </div>
    </div>

    {view === "calendar" ? <div className="mt-3 hidden md:block">
      <div className="grid grid-cols-7">{weekDays.map(day => <span key={day} className="px-2.5 py-2 text-xs text-[var(--orbit-muted,#787774)]">{day}</span>)}</div>
      <div className="grid grid-cols-7 border-l border-t border-[var(--orbit-line,#e9e8e5)]">
        {calendarDays.map(date => {
          const key = dateKey(date);
          const isToday = key === today;
          const isSelected = key === selectedDay;
          const dayEvents = eventsByDay.get(key) ?? [];
          return <div key={key} className={`min-h-[102px] min-w-0 border-b border-r border-[var(--orbit-line,#e9e8e5)] p-2 ${isSelected ? "bg-[#F8FAFD]" : "bg-white"}`}>
            <button type="button" aria-label={`${date.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}, ${dayEvents.length} tarefas`} aria-pressed={isSelected} aria-current={isToday ? "date" : undefined} onClick={() => selectDay(key)} className={`mb-1.5 flex h-7 min-w-7 items-center justify-center rounded text-xs ${focus} ${isToday ? "bg-[var(--orbit-accent,#2383e2)] text-white" : date.getMonth() !== month.getMonth() ? "text-[#BAB9B4]" : "text-[var(--orbit-muted,#787774)]"}`}>{date.getDate()}</button>
            <div className="space-y-1">
              {dayEvents.slice(0, 3).map(task => <button type="button" key={task.id} onClick={() => onEditTask(task)} title={`${eventTime(task)} · ${task.title}`} className={`block w-full truncate rounded py-0.5 text-left text-[11px] ${focus} ${task.status === "Concluído" ? "line-through opacity-60" : ""}`} style={{ color: areaColor[task.area].text }}>{task.scheduledAt ? `${eventTime(task)}  ` : ""}{task.title}</button>)}
              {dayEvents.length > 3 && <button type="button" onClick={() => { selectDay(key); setView("list"); }} className={`rounded text-xs text-[var(--orbit-muted,#787774)] ${focus}`}>+{dayEvents.length - 3} tarefas</button>}
            </div>
          </div>;
        })}
      </div>
      <p className="mt-3 text-xs text-[var(--orbit-muted,#787774)]">{selectedDate.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })} selecionado · {dayTasks.length} {dayTasks.length === 1 ? "tarefa" : "tarefas"}</p>
    </div> : <div className="mt-5 hidden space-y-6 md:block">
      {monthGroups.length ? monthGroups.map(([key, group]) => <div key={key}>
        <h3 className="mb-3 text-sm font-semibold capitalize">{key === today ? "Hoje" : dayDate(key).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</h3>
        <ul className="space-y-2">{group.map(task => <TaskEvent key={task.id} task={task} onEditTask={onEditTask} onFinishTask={onFinishTask} />)}</ul>
      </div>) : <div className="py-12 text-center text-sm text-[var(--orbit-muted,#787774)]"><CalendarDays size={28} className="mx-auto mb-3 opacity-60" /><p>Nenhuma tarefa agendada neste mês.</p><Button variant="ghost" onClick={() => onCreateTask(selectedDay)} className="mt-3"><Plus size={16} />Agendar tarefa</Button></div>}
    </div>}

    <div className="md:hidden">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button variant="ghost" size="icon" className="size-11" onClick={() => moveWeek(-1)} aria-label="Semana anterior"><ChevronLeft size={17} /></Button>
        <Button variant="ghost" className="min-h-11 text-xs text-[var(--orbit-muted,#787774)]" onClick={() => selectDay(today)}>Hoje · {selectedDate.toLocaleDateString("pt-BR", { month: "long" })}</Button>
        <Button variant="ghost" size="icon" className="size-11" onClick={() => moveWeek(1)} aria-label="Próxima semana"><ChevronRight size={17} /></Button>
      </div>
      <div className="grid grid-cols-7 gap-1 border-b border-[var(--orbit-line,#e9e8e5)] pb-5" aria-label="Dias da semana">
        {week.map((date, index) => <button type="button" key={dateKey(date)} onClick={() => selectDay(dateKey(date))} aria-label={date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })} aria-pressed={dateKey(date) === selectedDay} aria-current={dateKey(date) === today ? "date" : undefined} className={`relative flex min-h-[62px] min-w-0 flex-col items-center justify-center gap-2 rounded-[5px] ${focus} ${dateKey(date) === selectedDay ? "bg-[#E5F0E8]" : "hover:bg-[#F7F7F5]"}`}>
          <span className="text-xs text-[var(--orbit-muted,#787774)]">{mobileWeekDays[index]}</span><span className="text-sm font-semibold">{date.getDate()}</span>
          {!!eventsByDay.get(dateKey(date))?.length && <span className="absolute bottom-1 size-1 rounded-full bg-[var(--orbit-muted,#787774)]" aria-hidden="true" />}
        </button>)}
      </div>
      <h2 className="mb-4 mt-5 text-[15px] font-semibold">{selectedDay === today ? "Hoje" : selectedDate.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}</h2>
      {dayTasks.length ? <ul className="space-y-3">{dayTasks.map(task => <TaskEvent key={task.id} task={task} onEditTask={onEditTask} onFinishTask={onFinishTask} />)}</ul> : <div className="py-6 text-sm text-[var(--orbit-muted,#787774)]"><p>Um dia com espaço livre.</p><p className="mt-1 text-xs">Nenhuma tarefa agendada para esta data.</p></div>}
      <Button onClick={() => onCreateTask(selectedDay)} className="mt-4 min-h-11 rounded bg-[var(--orbit-accent,#2383e2)] text-[13px] text-white hover:bg-[#1c71c7]"><Plus size={15} />Novo evento</Button>
      <Button variant="ghost" onClick={onEnableNotifications} className="ml-1 mt-4 min-h-11 text-xs text-[var(--orbit-muted,#787774)]"><Bell size={15} />Lembretes</Button>
    </div>

    <p className="mt-5 text-xs leading-relaxed text-[var(--orbit-muted,#787774)]">{timezone} · Lembretes disponíveis enquanto o Orbit estiver aberto.</p>
  </section>;
}
