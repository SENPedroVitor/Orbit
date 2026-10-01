"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FocusTimer, Task } from "@/lib/workspace";
export const defaultTimer:FocusTimer={duration:1500,remaining:1500,endsAt:null,taskId:null};
export function FocusTimerPanel({value,tasks,onChange,onFinish}:{value?:FocusTimer;tasks:Task[];onChange:(value:FocusTimer)=>void;onFinish:()=>void}){
 const timer=value??defaultTimer;
 const [now,setNow]=useState(()=>Date.now());
 const [finished,setFinished]=useState(false);
 const [durationDraft,setDurationDraft]=useState(String(timer.duration/60));
 const completed=useRef<string|null>(null);
 const audio=useRef<AudioContext|null>(null);
 const seconds=timer.endsAt?Math.max(0,Math.ceil((Date.parse(timer.endsAt)-now)/1000)):timer.remaining;
 useEffect(()=>{setDurationDraft(String(timer.duration/60));},[timer.duration]);
 useEffect(()=>{if(!timer.endsAt)return;setNow(Date.now());const interval=setInterval(()=>setNow(Date.now()),250);return()=>clearInterval(interval);},[timer.endsAt]);
 useEffect(()=>{
  if(!timer.endsAt||Date.parse(timer.endsAt)>now||completed.current===timer.endsAt)return;
  completed.current=timer.endsAt;setFinished(true);onChange({...timer,endsAt:null,remaining:0});onFinish();
  const context=audio.current;if(context?.state==="running"){
   const oscillator=context.createOscillator();const gain=context.createGain();oscillator.connect(gain);gain.connect(context.destination);oscillator.frequency.value=660;gain.gain.value=0.12;oscillator.start();oscillator.stop(context.currentTime+0.5);
  }
 },[now,timer,onChange,onFinish]);
 useEffect(()=>()=>{void audio.current?.close();},[]);
 const start=()=>{setFinished(false);setNow(Date.now());try{audio.current??=new AudioContext();void audio.current.resume().catch(()=>{});}catch{}const remaining=timer.remaining||timer.duration;onChange({...timer,remaining,endsAt:new Date(Date.now()+remaining*1000).toISOString()});};
 const pause=()=>onChange({...timer,remaining:Math.max(0,Math.ceil((Date.parse(timer.endsAt!)-Date.now())/1000)),endsAt:null});
 const reset=()=>{setFinished(false);onChange({...timer,endsAt:null,remaining:timer.duration});};
 return <section className="timer-panel">
  <div className="timer-heading"><Timer size={22}/><h2>Tempo de foco</h2></div>
  <div className="timer-display" role="timer" aria-label="Tempo restante">{String(Math.floor(seconds/3600)).padStart(2,"0")}:{String(Math.floor(seconds%3600/60)).padStart(2,"0")}:{String(seconds%60).padStart(2,"0")}</div>
  <p className="timer-status" role="status">{finished||timer.remaining===0?"Tempo concluído. Faça uma pausa.":timer.endsAt?"Seu tempo de foco está em andamento.":timer.remaining<timer.duration?"Timer pausado. Continue quando quiser.":"Escolha um tempo e comece."}</p>
  <div className="timer-actions"><Button onClick={timer.endsAt?pause:start}>{timer.endsAt?<Pause size={16}/>:<Play size={16}/>} {timer.endsAt?"Pausar":"Iniciar"}</Button><Button variant="outline" onClick={reset}><RotateCcw size={16}/>Reiniciar</Button></div>
  <div className="timer-presets">{[5,15,25,50].map(minutes=><button key={minutes} disabled={!!timer.endsAt} className={timer.duration===minutes*60?"selected":""} onClick={()=>{setFinished(false);onChange({...timer,duration:minutes*60,remaining:minutes*60,endsAt:null});}}>{minutes} min</button>)}</div>
  <div className="dialog-form"><label>Duração em minutos<input aria-label="Duração do timer" type="number" min="1" max="1440" disabled={!!timer.endsAt} value={durationDraft} onBlur={()=>setDurationDraft(String(timer.duration/60))} onChange={e=>{setDurationDraft(e.target.value);const minutes=Number(e.target.value);if(Number.isInteger(minutes)&&minutes>=1&&minutes<=1440){setFinished(false);onChange({...timer,duration:minutes*60,remaining:minutes*60,endsAt:null});}}}/></label><label>Tarefa em foco<select value={timer.taskId??""} onChange={e=>onChange({...timer,taskId:e.target.value||null})}><option value="">Nenhuma</option>{tasks.filter(t=>t.status!=="Concluído"||t.id===timer.taskId).map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label></div>
  <p className="form-note">O horário final fica salvo na sua conta. O som toca com o Orbit aberto após iniciar o timer neste navegador.</p>
 </section>;
}
