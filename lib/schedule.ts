import type { Task } from "./workspace";
export const repeatLabels={none:"Não repetir",daily:"Todos os dias",weekly:"Toda semana",monthly:"Todo mês"};
export function localDateTime(iso?:string|null){
 if(!iso)return "";
 const date=new Date(iso);const pad=(n:number)=>String(n).padStart(2,"0");
 return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
// UTC surrogate for calendar arithmetic in the schedule's original timezone.
function wallDate(iso:string,timezone:string){
 const parts=new Intl.DateTimeFormat("en-US",{timeZone:timezone,year:"numeric",month:"numeric",day:"numeric",hour:"numeric",minute:"numeric",second:"numeric",hourCycle:"h23"}).formatToParts(new Date(iso));
 const get=(type:string)=>Number(parts.find(p=>p.type===type)?.value);
 return new Date(Date.UTC(get("year"),get("month")-1,get("day"),get("hour"),get("minute"),get("second")));
}
function fromWall(wall:Date,timezone:string){
 let timestamp=wall.getTime();const seen=new Set<number>();
 for(let i=0;i<5;i++){
  const difference=wall.getTime()-wallDate(new Date(timestamp).toISOString(),timezone).getTime();
  if(difference===0)return new Date(timestamp);
  seen.add(timestamp);const next=timestamp+difference;
  if(seen.has(next))return new Date(Math.max(timestamp,next));
  timestamp=next;
 }
 return new Date(timestamp);
}
export function recurrenceDay(task:Task){return task.scheduledAt?wallDate(task.scheduledAt,task.scheduleTimezone??"UTC").getUTCDate():undefined;}
export function nextOccurrence(task:Task,now=new Date()):string|null{
 if(!task.scheduledAt||!task.repeat||task.repeat==="none")return null;
 const timezone=task.scheduleTimezone??"UTC";
 const original=wallDate(task.scheduledAt,timezone);
 const nowWall=wallDate(now.toISOString(),timezone);
 const elapsed=task.repeat==="monthly"?(nowWall.getUTCFullYear()-original.getUTCFullYear())*12+nowWall.getUTCMonth()-original.getUTCMonth():Math.floor((nowWall.getTime()-original.getTime())/(86400000*(task.repeat==="weekly"?7:1)));
 const start=Math.max(1,elapsed);
 for(let step=start;step<start+3;step++){
  const candidate=new Date(original);
  if(task.repeat==="daily")candidate.setUTCDate(original.getUTCDate()+step);
  if(task.repeat==="weekly")candidate.setUTCDate(original.getUTCDate()+7*step);
  if(task.repeat==="monthly"){
   candidate.setUTCDate(1);candidate.setUTCMonth(original.getUTCMonth()+step);
   candidate.setUTCDate(Math.min(task.repeatDay??original.getUTCDate(),new Date(Date.UTC(candidate.getUTCFullYear(),candidate.getUTCMonth()+1,0)).getUTCDate()));
  }
  const date=fromWall(candidate,timezone);if(date>now)return date.toISOString();
 }
 return null;
}
export function scheduleLabel(task:Task){
 if(!task.scheduledAt)return "";
 const label=new Date(task.scheduledAt).toLocaleString("pt-BR",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
 return label+(task.repeat&&task.repeat!=="none"?` · ${repeatLabels[task.repeat]}`:"");
}
