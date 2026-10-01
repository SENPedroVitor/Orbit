"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import type { Element } from "hast";
import { Download, Pencil, Network, Loader2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { renderDiagram, cachedDiagram } from "@/lib/render-diagram";
import { diagramSourceError } from "@/lib/diagrams";
export const DiagramEditContext=createContext<((source:string,start:number,end:number)=>void)|null>(null);
function astText(node:{value?:string;children?:unknown[]}):string{
 return typeof node.value==="string"?node.value:(node.children??[]).map(child=>astText(child as {value?:string;children?:unknown[]})).join("");
}
export function MarkdownPre({node,children,...props}:ComponentProps<"pre">&{node?:Element}){
 const edit=useContext(DiagramEditContext);
 const code=node?.children[0];
 if(code?.type==="element"&&code.tagName==="code"&&Array.isArray(code.properties.className)&&code.properties.className.includes("language-mermaid")){
  const source=astText(code).replace(/\n$/,"");const start=node?.position?.start.offset;const end=node?.position?.end.offset;
  return <DiagramPreview source={source} onEdit={edit&&typeof start==="number"&&typeof end==="number"?()=>edit(source,start,end):undefined}/>;
 }
 return <pre {...props}>{children}</pre>;
}
export function DiagramPreview({source,onEdit,onReady,compact=false}:{source:string;onEdit?:()=>void;onReady?:(valid:boolean)=>void;compact?:boolean}){
 const [result,setResult]=useState<{source:string;svg:string;error:string}>({source,svg:cachedDiagram(source)??"",error:diagramSourceError(source)??""});
 const [zoom,setZoom]=useState(1);
 const [canvasWidth,setCanvasWidth]=useState(500);
 const [canvasHeight,setCanvasHeight]=useState(400);
 const canvas=useRef<HTMLDivElement>(null);
 const ready=useRef(onReady);ready.current=onReady;
 const svg=result.source===source?result.svg:"";const error=result.source===source?result.error:"";
 const viewBox=/viewBox="([^"]+)"/.exec(svg)?.[1].split(/\s+/).map(Number);
 const width=viewBox?.[2]||800;const height=viewBox?.[3]||400;
 const fit=Math.min(canvasWidth/width,canvasHeight/height);
 useEffect(()=>{if(!canvas.current)return;const observer=new ResizeObserver(()=>{if(canvas.current){setCanvasWidth(Math.max(100,canvas.current.clientWidth-64));setCanvasHeight(Math.max(100,canvas.current.clientHeight-64));}});observer.observe(canvas.current);return()=>observer.disconnect();},[svg]);
 useEffect(()=>{
  let canceled=false;ready.current?.(false);setZoom(1);
  const timer=setTimeout(()=>{void renderDiagram(source).then(svg=>{if(canceled)return;setResult({source,svg,error:""});ready.current?.(true);}).catch(error=>{if(canceled)return;const detail=String(error instanceof Error?error.message:error).split("\n").slice(0,5).join("\n").slice(0,500);setResult({source,svg:"",error:diagramSourceError(source)??detail});ready.current?.(false);});},250);
  return()=>{canceled=true;clearTimeout(timer);};
 },[source]);
 const exportSvg=()=>{if(!svg)return;const url=URL.createObjectURL(new Blob([svg],{type:"image/svg+xml;charset=utf-8"}));const link=document.createElement("a");link.href=url;link.download="orbit-diagrama.svg";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 return <section className={"diagram-card "+(compact?"diagram-compact":"")} aria-label="Diagrama">
  <div className="diagram-toolbar"><span><Network size={15}/>{compact?"Prévia":"Diagrama"}</span><div>{onEdit&&<button type="button" onClick={onEdit}><Pencil size={14}/>Editar</button>}<button type="button" onClick={exportSvg} disabled={!svg}><Download size={14}/><span>Exportar SVG</span></button></div></div>
  <div className="diagram-zoom"><button type="button" aria-label="Diminuir diagrama" title="Diminuir" disabled={!svg||zoom<=.5} onClick={()=>setZoom(z=>Math.max(.5,z-.25))}><ZoomOut size={16}/></button><span>{Math.round(zoom*100)}%</span><button type="button" aria-label="Ampliar diagrama" title="Ampliar" disabled={!svg||zoom>=3} onClick={()=>setZoom(z=>Math.min(3,z+.25))}><ZoomIn size={16}/></button><i/><button type="button" aria-label="Ajustar diagrama" title="Ajustar à área" disabled={!svg} onClick={()=>setZoom(1)}><RotateCcw size={15}/></button></div>
  {error?<div className="diagram-error" role="alert"><strong>Revise o código do diagrama</strong><pre>{error}</pre>{onEdit&&<button type="button" onClick={onEdit}>Editar diagrama</button>}</div>:svg?<div ref={canvas} className="diagram-canvas"><img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt="Diagrama criado a partir do código Mermaid" style={{width:width*fit*zoom,maxWidth:"none"}}/></div>:<div className="diagram-loading" role="status"><Loader2 size={18} className="spin"/>Desenhando o diagrama…</div>}
 </section>;
}
