export const diagramTemplates={
 flowchart:{label:"Fluxograma",source:'flowchart TD\n  A[Uma ideia] --> B[Planejar]\n  B --> C{Pronto para começar?}\n  C -->|Sim| D[Colocar em prática]\n  C -->|Ainda não| B'},
 mindmap:{label:"Mapa mental",source:'mindmap\n  root((Meu projeto))\n    Objetivos\n      Resultado esperado\n      Prioridades\n    Planejamento\n      Etapas\n      Recursos\n    Próximos passos'},
 sequence:{label:"Sequência",source:'sequenceDiagram\n  actor Pessoa\n  participant Orbit\n  participant Codex\n  Pessoa->>Orbit: Registrar uma ideia\n  Codex->>Orbit: Consultar a página\n  Orbit-->>Codex: Conteúdo em Markdown\n  Codex-->>Pessoa: Organizar os próximos passos'},
};
export type DiagramTemplate=keyof typeof diagramTemplates;
export type DiagramRange={start:number;end:number;original:string};
export function diagramFence(source:string){
 const longest=Math.max(2,...Array.from(source.matchAll(/`+/g),match=>match[0].length));
 const fence="`".repeat(longest+1);
 return `${fence}mermaid\n${source.trim()}\n${fence}`;
}
export function replaceDiagram(content:string,range:DiagramRange,source:string){
 if(content.slice(range.start,range.end)!==range.original)throw new Error("O texto mudou enquanto você editava. Feche e abra o diagrama novamente.");
 return content.slice(0,range.start)+diagramFence(source)+content.slice(range.end);
}
export function diagramSourceError(source:string){
 if(!source.trim())return "Escreva um diagrama ou escolha um modelo.";
 if(source.length>20000)return "Use até 20.000 caracteres por diagrama.";
 if(source.trimStart().startsWith("---")||/%%\s*\{/.test(source))return "Use apenas o código do diagrama, sem configurações de tema.";
 return null;
}
