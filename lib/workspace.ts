import { z } from "zod";
export const areas = ["Pessoal", "Estudos", "Trabalho", "Programação"] as const;
export const pageSchema = z.object({id:z.string().min(1).max(100),title:z.string().max(200),area:z.enum(areas),content:z.string().max(200000),favorite:z.boolean(),archived:z.boolean(),parentId:z.string().max(100).nullable(),updatedAt:z.string().max(50)});
export const taskSchema = z.object({id:z.string().min(1).max(100),title:z.string().min(1).max(300),area:z.enum(areas),status:z.enum(["A fazer","Em andamento","Concluído"]),priority:z.enum(["Baixa","Média","Alta"]),due:z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/),pageId:z.string().max(100).nullable(),scheduledAt:z.string().datetime().nullable().optional(),repeat:z.enum(["none","daily","weekly","monthly"]).optional(),reminder:z.boolean().optional(),scheduleTimezone:z.string().max(100).refine(value=>{try{new Intl.DateTimeFormat("en",{timeZone:value});return true;}catch{return false;}},"Fuso horário inválido").optional(),repeatDay:z.number().int().min(1).max(31).optional(),notes:z.string().max(5000).optional()});
export const timerSchema=z.object({duration:z.number().int().min(1).max(86400),remaining:z.number().int().min(0).max(86400),endsAt:z.string().datetime().nullable(),taskId:z.string().max(100).nullable(),mode:z.enum(["focus","break","custom"]).optional()});
export type FocusTimer=z.infer<typeof timerSchema>;
export const relationships = ["Amigo", "Amiga", "Parceiro", "Parceira", "Família", "Trabalho", "Estudos", "Outro"] as const;
const calendarDate=z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/).refine(value=>!value||Number.isFinite(new Date(`${value}T12:00:00`).getTime())&&new Date(`${value}T12:00:00`).toLocaleDateString("sv-SE")===value,"Data inválida");
export const contactSchema=z.object({id:z.string().min(1).max(100),date:z.string().datetime(),note:z.string().max(5000)});
export const personSchema=z.object({id:z.string().min(1).max(100),name:z.string().trim().min(1).max(200),relationship:z.enum(relationships),portrait:z.number().int().min(0).max(11).nullable(),birthday:calendarDate,nextMeeting:calendarDate,birthdayReminder:z.enum(["none","day","three-days","week"]),interests:z.array(z.string().max(100)).max(30),notes:z.string().max(20000),contacts:z.array(contactSchema).max(200),presents:z.array(z.object({id:z.string().min(1).max(100),title:z.string().trim().min(1).max(300),done:z.boolean()})).max(100)}).superRefine((person,ctx)=>{for(const list of [person.contacts,person.presents])if(new Set(list.map(item=>item.id)).size!==list.length)ctx.addIssue({code:"custom",message:"IDs duplicados"});});
export const goalSchema=z.object({id:z.string().min(1).max(100),title:z.string().trim().min(1).max(300),area:z.enum(areas),due:calendarDate,taskIds:z.array(z.string().min(1).max(100)).max(1000),reason:z.string().max(20000)}).superRefine((goal,ctx)=>{if(new Set(goal.taskIds).size!==goal.taskIds.length)ctx.addIssue({code:"custom",message:"Tarefas duplicadas"});});
export const focusSessionSchema=z.object({id:z.string().min(1).max(100),date:z.string().datetime(),duration:z.number().int().min(1).max(86400),taskId:z.string().max(100).nullable(),mode:z.enum(["focus","break","custom"])});
export const workspaceSchema=z.object({pages:z.array(pageSchema).max(1000),tasks:z.array(taskSchema).max(3000),timer:timerSchema.optional(),people:z.array(personSchema).max(500).default([]),goals:z.array(goalSchema).max(500).default([]),focusSessions:z.array(focusSessionSchema).max(5000).default([])}).superRefine((data,ctx)=>{
 for(const list of [data.pages,data.tasks,data.people,data.goals,data.focusSessions])if(new Set(list.map(x=>x.id)).size!==list.length)ctx.addIssue({code:"custom",message:"IDs duplicados"});
 for(const page of data.pages){let current=page;const seen=new Set([page.id]);while(current.parentId){const next=data.pages.find(x=>x.id===current.parentId);if(!next||seen.has(next.id)){ctx.addIssue({code:"custom",message:"Hierarquia inválida"});break;}seen.add(next.id);current=next;}}
});
export type Page=z.infer<typeof pageSchema>;
export type Task=z.infer<typeof taskSchema>;
export type Person=z.infer<typeof personSchema>;
export type Goal=z.infer<typeof goalSchema>;
export type FocusSession=z.infer<typeof focusSessionSchema>;
export type Workspace=z.infer<typeof workspaceSchema>;
export function initialWorkspace():Workspace { return {pages:[],tasks:[],people:[],goals:[],focusSessions:[]}; }
