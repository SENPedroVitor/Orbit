"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, ListTodo, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FocusTimer, Task } from "@/lib/workspace";
import "./focus-timer.css";

export const defaultTimer: FocusTimer = {
  duration: 1500,
  remaining: 1500,
  endsAt: null,
  taskId: null,
  mode: "focus",
};

type TimerMode = "focus" | "break" | "custom";

export type FinishedFocusSession = {
  duration: number;
  taskId: string | null;
  mode: TimerMode;
};

function initialMode(duration: number): TimerMode {
  if (duration === 1500 || duration === 3000) return "focus";
  if (duration === 300 || duration === 900) return "break";
  return "custom";
}

function formatRemaining(seconds: number) {
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const remainder = String(seconds % 60).padStart(2, "0");
  return seconds >= 3600
    ? `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${minutes}:${remainder}`
    : `${minutes}:${remainder}`;
}

export function FocusTimerPanel({
  value,
  tasks,
  onChange,
  onFinish,
}: {
  value?: FocusTimer;
  tasks: Task[];
  onChange: (value: FocusTimer) => void;
  onFinish: (session: FinishedFocusSession) => void;
}) {
  const timer = value ?? defaultTimer;
  const [now, setNow] = useState(() => Date.now());
  const [finished, setFinished] = useState(false);
  const [mode, setMode] = useState<TimerMode>(() => timer.mode ?? initialMode(timer.duration));
  const [durationDraft, setDurationDraft] = useState(String(timer.duration / 60));
  const modeRef = useRef(mode);
  const completed = useRef<string | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const running = !!timer.endsAt;
  const selectedTask = tasks.find((task) => task.id === timer.taskId);
  const seconds = timer.endsAt
    ? Math.max(0, Math.ceil((Date.parse(timer.endsAt) - now) / 1000))
    : timer.remaining;
  const ended = finished || timer.remaining === 0;
  const paused = !running && !ended && timer.remaining < timer.duration;
  const status = ended
    ? "Sessão concluída"
    : running
      ? mode === "break" ? "Sua pausa está em andamento" : "Seu foco está em andamento"
      : paused
        ? "Pausado. Continue quando quiser."
        : "Pronto para começar";

  useEffect(() => {
    setDurationDraft(String(timer.duration / 60));
    const nextMode = timer.mode ?? initialMode(timer.duration);
    modeRef.current = nextMode;
    setMode(nextMode);
    setFinished(false);
  }, [timer.duration, timer.mode]);

  useEffect(() => {
    if (!timer.endsAt) return;
    setFinished(false);
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [timer.endsAt]);

  useEffect(() => {
    if (!timer.endsAt || Date.parse(timer.endsAt) > now || completed.current === timer.endsAt) return;
    completed.current = timer.endsAt;
    setFinished(true);
    onChange({ ...timer, endsAt: null, remaining: 0 });
    onFinish({ duration: timer.duration, taskId: timer.taskId, mode: modeRef.current });
    const context = audio.current;
    if (context?.state === "running") {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.frequency.value = 660;
      gain.gain.value = 0.12;
      oscillator.start();
      oscillator.stop(context.currentTime + 0.5);
    }
  }, [now, timer, onChange, onFinish]);

  useEffect(() => () => { void audio.current?.close(); }, []);

  const setDuration = (minutes: number) => {
    setFinished(false);
    onChange({ ...timer, mode: modeRef.current, duration: minutes * 60, remaining: minutes * 60, endsAt: null });
  };

  const selectMode = (next: TimerMode) => {
    if (next === mode) return;
    modeRef.current = next;
    setMode(next);
    if (next === "focus") setDuration(25);
    if (next === "break") setDuration(5);
    if (next === "custom") onChange({ ...timer, mode: next });
  };

  const start = () => {
    setFinished(false);
    setNow(Date.now());
    try {
      audio.current ??= new AudioContext();
      void audio.current.resume().catch(() => {});
    } catch {}
    const remaining = timer.remaining || timer.duration;
    onChange({ ...timer, mode: modeRef.current, remaining, endsAt: new Date(Date.now() + remaining * 1000).toISOString() });
  };

  const pause = () => {
    if (!timer.endsAt) return;
    onChange({
      ...timer,
      remaining: Math.max(0, Math.ceil((Date.parse(timer.endsAt) - Date.now()) / 1000)),
      endsAt: null,
    });
  };

  const reset = () => {
    setFinished(false);
    onChange({ ...timer, endsAt: null, remaining: timer.duration });
  };

  return (
    <section className="orbit-focus" aria-label="Sessão de foco">
      <div className="orbit-focus-session">
        <div className="orbit-focus-modes" role="group" aria-label="Tipo de sessão">
          {([
            ["focus", "Foco"],
            ["break", "Pausa"],
            ["custom", "Personalizado"],
          ] as const).map(([key, label]) => (
            <button
              type="button"
              key={key}
              className={mode === key ? "is-selected" : ""}
              aria-pressed={mode === key}
              disabled={running}
              onClick={() => selectMode(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="orbit-focus-duration">
          {mode === "custom" ? (
            <label className="orbit-focus-custom">
              Duração em minutos
              <input
                type="number"
                min="1"
                max="1440"
                step="1"
                disabled={running}
                value={durationDraft}
                onBlur={() => setDurationDraft(String(timer.duration / 60))}
                onChange={(event) => {
                  setDurationDraft(event.target.value);
                  const minutes = Number(event.target.value);
                  if (Number.isInteger(minutes) && minutes >= 1 && minutes <= 1440) setDuration(minutes);
                }}
              />
            </label>
          ) : (
            <div className="orbit-focus-presets" role="group" aria-label="Duração da sessão">
              {(mode === "break" ? [5, 15] : [25, 50]).map((minutes) => (
                <button
                  type="button"
                  key={minutes}
                  className={timer.duration === minutes * 60 ? "is-selected" : ""}
                  aria-pressed={timer.duration === minutes * 60}
                  disabled={running}
                  onClick={() => setDuration(minutes)}
                >
                  {minutes} min
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="orbit-focus-clock" role="timer" aria-label="Tempo restante" aria-live="off">
          {formatRemaining(seconds)}
        </div>
        <p className="orbit-focus-status" role="status">{status}</p>

        <label className="orbit-focus-task">
          <span>Tarefa vinculada</span>
          <span className="orbit-focus-task-field">
            <ListTodo size={17} aria-hidden="true" />
            <select
              value={timer.taskId ?? ""}
              onChange={(event) => onChange({ ...timer, taskId: event.target.value || null })}
            >
              <option value="">Escolher uma tarefa</option>
              {timer.taskId && !selectedTask && <option value={timer.taskId}>Tarefa indisponível</option>}
              {tasks
                .filter((task) => task.status !== "Concluído" || task.id === timer.taskId)
                .map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </span>
        </label>

        <div className="orbit-focus-actions">
          <Button type="button" className="orbit-focus-start" onClick={running ? pause : start}>
            {running ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
            {running ? "Pausar" : paused ? "Continuar" : mode === "break" ? "Iniciar pausa" : "Iniciar foco"}
          </Button>
          <Button type="button" variant="outline" className="orbit-focus-reset" onClick={reset}>
            <RotateCcw size={16} aria-hidden="true" />Reiniciar
          </Button>
        </div>

        <p className="orbit-focus-hint">
          <Bell size={14} aria-hidden="true" />
          Ao terminar, o Orbit avisa que a sessão foi concluída.
        </p>
      </div>

      <div className="orbit-focus-summary">
        <h2>Sobre esta sessão</h2>
        <dl>
          <div><dt>Duração</dt><dd>{timer.duration / 60} {timer.duration === 60 ? "minuto" : "minutos"}</dd></div>
          <div><dt>Tarefa</dt><dd>{selectedTask?.title ?? (timer.taskId ? "Tarefa indisponível" : "Nenhuma tarefa vinculada")}</dd></div>
          <div><dt>Status</dt><dd>{ended ? "Concluída" : running ? "Em andamento" : paused ? "Pausada" : "Ainda não iniciada"}</dd></div>
        </dl>
      </div>
      <p className="orbit-focus-note">
        O horário final fica salvo na sua conta. O som toca com o Orbit aberto após iniciar o timer neste navegador.
      </p>
    </section>
  );
}
