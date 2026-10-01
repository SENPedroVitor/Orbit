import { diagramSourceError } from "./diagrams";
const cache=new Map<string,string>();
let engine:Promise<typeof import("mermaid")["default"]>|null=null;
let queue=Promise.resolve();
let nextId=0;
let font:Promise<string>|null=null;
function diagramFont(){
 font??=fetch("/fonts/inter-latin.woff2").then(async response=>{
  if(!response.ok)return "";
  const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length>500000)return "";
  let binary="";for(let start=0;start<bytes.length;start+=8192)binary+=String.fromCharCode(...bytes.subarray(start,start+8192));
  return btoa(binary);
 }).catch(()=>"");
 return font;
}
export function cachedDiagram(source:string){return cache.get(source);}
function mermaidEngine(){
 engine??=import("mermaid").then(({default:mermaid})=>{
  mermaid.initialize({startOnLoad:false,securityLevel:"strict",suppressErrorRendering:true,maxTextSize:20000,maxEdges:300,theme:"base",fontFamily:"Inter, Arial, sans-serif",htmlLabels:false,flowchart:{htmlLabels:false},themeVariables:{fontFamily:"Inter, Arial, sans-serif",fontSize:"16px",primaryColor:"#edf2ff",primaryTextColor:"#25334b",primaryBorderColor:"#8599cc",lineColor:"#64748b",secondaryColor:"#f4f6fa",tertiaryColor:"#ffffff"},secure:["secure","securityLevel","startOnLoad","maxTextSize","maxEdges","suppressErrorRendering","themeCSS","themeVariables","htmlLabels","flowchart"]});
  return mermaid;
 }).catch(error=>{engine=null;throw error;});
 return engine;
}
export async function renderDiagram(source:string):Promise<string>{
 const validation=diagramSourceError(source);if(validation)throw new Error(validation);
 const existing=cache.get(source);if(existing)return existing;
 const work=queue.then(async()=>{
  const existing=cache.get(source);if(existing)return existing;
  const [mermaid,{default:purify},inter]=await Promise.all([mermaidEngine(),import("dompurify"),diagramFont()]);
  await document.fonts.ready;
  const id=`orbit-diagram-${++nextId}`;
  try{
   const rendered=await mermaid.render(id,source);
   const clean=purify.sanitize(rendered.svg,{USE_PROFILES:{svg:true,svgFilters:true},FORBID_TAGS:["foreignObject","script","image","a"]});
   const doc=new DOMParser().parseFromString(clean,"image/svg+xml");
   if(doc.querySelector("parsererror")||doc.documentElement.tagName!=="svg")throw new Error("Não foi possível desenhar o diagrama.");
   const unsafeCss=(text:string)=>/@import|url\(\s*["']?(?!#)/i.test(text);
   for(const style of doc.querySelectorAll("style"))if(unsafeCss(style.textContent??""))style.remove();
   for(const element of doc.querySelectorAll("*"))for(const attr of Array.from(element.attributes)){
    if((/href$/i.test(attr.name)&&!attr.value.startsWith("#"))||(/style/i.test(attr.name)&&unsafeCss(attr.value)))element.removeAttribute(attr.name);
   }
   if(inter){const style=doc.createElementNS("http://www.w3.org/2000/svg","style");style.textContent=`@font-face{font-family:Inter;font-style:normal;font-weight:100 900;src:url(data:font/woff2;base64,${inter}) format('woff2');}`;doc.documentElement.insertBefore(style,doc.documentElement.firstChild);}
   const svg=new XMLSerializer().serializeToString(doc.documentElement);
   if(cache.size>=30)cache.delete(cache.keys().next().value!);cache.set(source,svg);
   return svg;
  }finally{document.getElementById(`d${id}`)?.remove();}
 });
 queue=work.then(()=>{},()=>{});
 return work;
}
