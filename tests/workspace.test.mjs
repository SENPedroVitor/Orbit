import test from 'node:test';
import assert from 'node:assert/strict';
import { workspaceSchema, initialWorkspace } from '../lib/workspace.ts';
import { mergeWorkspace } from '../lib/import-workspace.ts';

test('legacy workspaces preserve Markdown, schedules and timer while gaining empty collections',()=>{
  const page={id:'p',title:'Existing',area:'Programação',content:'# Private note\n```ts\nconst x=1;\n```',favorite:true,archived:false,parentId:null,updatedAt:'2026-10-09T12:00:00Z'};
  const task={id:'t',title:'Existing task',area:'Estudos',status:'A fazer',priority:'Média',due:'',pageId:'p',scheduledAt:'2026-10-09T12:00:00Z',repeat:'weekly'};
  const timer={duration:1500,remaining:1200,endsAt:null,taskId:'t'};
  const result=workspaceSchema.parse({pages:[page],tasks:[task],timer});
  assert.deepEqual(result.pages,[page]); assert.deepEqual(result.tasks,[task]); assert.deepEqual(result.timer,timer);
  assert.deepEqual(result.people,[]); assert.deepEqual(result.goals,[]); assert.deepEqual(result.focusSessions,[]); assert.deepEqual(initialWorkspace(),{pages:[],tasks:[],people:[],goals:[],focusSessions:[]});
});

test('backup import adds content without overwriting and remaps page/task/goal relationships',()=>{
  const page={id:'same',title:'Test',area:'Pessoal',content:'Preserve',favorite:false,archived:false,parentId:null,updatedAt:'2026-10-09'};
  const task={id:'task',title:'Test',area:'Pessoal',status:'A fazer',priority:'Média',due:'',pageId:'same'};
  const incoming=workspaceSchema.parse({pages:[page,{...page,id:'child',parentId:'same'}],tasks:[task],goals:[{id:'goal',title:'Goal',area:'Pessoal',due:'',reason:'Reason',taskIds:['task']}]});
  const existing=workspaceSchema.parse({pages:[page],tasks:[task],timer:{duration:1500,remaining:100,endsAt:null,taskId:'task'}});
  const result=workspaceSchema.parse(mergeWorkspace(existing,incoming));
  assert.equal(result.pages.length,3); assert.deepEqual(result.pages[0],page); assert.deepEqual(result.tasks[0],task);
  assert.notEqual(result.pages[1].id,page.id); assert.equal(result.pages[2].parentId,result.pages[1].id);
  assert.equal(result.tasks[1].pageId,result.pages[1].id); assert.deepEqual(result.goals[0].taskIds,[result.tasks[1].id]); assert.deepEqual(result.timer,existing.timer);
});

test('a custom five-minute timer keeps its session type after saving and loading',()=>{
  const timer={duration:300,remaining:200,endsAt:'2026-10-09T12:05:00Z',taskId:null,mode:'custom'};
  const saved=workspaceSchema.parse({...initialWorkspace(),timer});
  const loaded=workspaceSchema.parse(JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(loaded.timer,timer);
  assert.equal(loaded.timer.mode,'custom');
});
