"use client";
import { useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import type { Task } from "@/lib/workspace";
export function TaskReminders({tasks,onOpen}:{tasks:Task[];onOpen:(task:Task)=>void}){
 const [now,setNow]=useState(()=>Date.now());
 const [dismissed,setDismissed]=useState<string[]>([]);
 const notified=useRef(new Set<string>());
 useEffect(()=>{const interval=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(interval);},[]);
 const due=tasks.filter(t=>t.status!=="Concluído"&&t.reminder&&t.scheduledAt&&Date.parse(t.scheduledAt)<=now);
 useEffect(()=>{for(const task of due){const key=task.id+task.scheduledAt;if(notified.current.has(key))continue;notified.current.add(key);if("Notification" in window&&Notification.permission==="granted"){try{new Notification("Orbit — tarefa agendada",{body:task.title,tag:key});}catch{}}}},[due]);
 const visible=due.filter(t=>!dismissed.includes(t.id+t.scheduledAt));
 if(!visible.length)return null;
 return <aside className="reminder-stack" aria-label="Lembretes de tarefas">{visible.slice(0,3).map(task=><div className="reminder" key={task.id+task.scheduledAt} role="status"><Bell size={19}/><button onClick={()=>onOpen(task)}><strong>{task.title}</strong><span>Horário da tarefa</span></button><button className="icon-button" aria-label={"Dispensar lembrete de "+task.title} onClick={()=>setDismissed(previous=>[...previous,task.id+task.scheduledAt])}><X size={16}/></button></div>)}</aside>;
}
