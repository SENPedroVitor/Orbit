import { z } from "zod";
export const areas = ["Pessoal", "Estudos", "Trabalho", "Programação"] as const;
export const pageSchema = z.object({id:z.string().min(1).max(100),title:z.string().max(200),area:z.enum(areas),content:z.string().max(200000),favorite:z.boolean(),archived:z.boolean(),parentId:z.string().max(100).nullable(),updatedAt:z.string().max(50)});
export const taskSchema = z.object({id:z.string().min(1).max(100),title:z.string().min(1).max(300),area:z.enum(areas),status:z.enum(["A fazer","Em andamento","Concluído"]),priority:z.enum(["Baixa","Média","Alta"]),due:z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/),pageId:z.string().max(100).nullable(),scheduledAt:z.string().datetime().nullable().optional(),repeat:z.enum(["none","daily","weekly","monthly"]).optional(),reminder:z.boolean().optional(),scheduleTimezone:z.string().max(100).refine(value=>{try{new Intl.DateTimeFormat("en",{timeZone:value});return true;}catch{return false;}},"Fuso horário inválido").optional(),repeatDay:z.number().int().min(1).max(31).optional()});
export const timerSchema=z.object({duration:z.number().int().min(1).max(86400),remaining:z.number().int().min(0).max(86400),endsAt:z.string().datetime().nullable(),taskId:z.string().max(100).nullable()});
export type FocusTimer=z.infer<typeof timerSchema>;
export const workspaceSchema=z.object({pages:z.array(pageSchema).max(1000),tasks:z.array(taskSchema).max(3000),timer:timerSchema.optional()}).superRefine((data,ctx)=>{
 for(const list of [data.pages,data.tasks])if(new Set(list.map(x=>x.id)).size!==list.length)ctx.addIssue({code:"custom",message:"IDs duplicados"});
 for(const page of data.pages){let current=page;const seen=new Set([page.id]);while(current.parentId){const next=data.pages.find(x=>x.id===current.parentId);if(!next||seen.has(next.id)){ctx.addIssue({code:"custom",message:"Hierarquia inválida"});break;}seen.add(next.id);current=next;}}
});
export type Page=z.infer<typeof pageSchema>;
export type Task=z.infer<typeof taskSchema>;
export type Workspace=z.infer<typeof workspaceSchema>;
export function initialWorkspace():Workspace { return {pages:[],tasks:[]}; }
