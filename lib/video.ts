export type Video={provider:"YouTube"|"Vimeo";id:string;embed:string;url:string;thumbnail?:string};
export function parseVideo(value:string):Video|null{
 try{
  const url=new URL(value);if(url.protocol!=="https:"||url.username||url.password||url.port)return null;
  const host=url.hostname.toLowerCase();let id:string|null=null;
  if(host==="youtu.be")id=url.pathname.split("/")[1];
  if(["youtube.com","www.youtube.com","m.youtube.com","www.youtube-nocookie.com"].includes(host)){
   id=url.pathname==="/watch"?url.searchParams.get("v"): /^\/(?:shorts|embed|live)\//.test(url.pathname)?url.pathname.split("/")[2]:null;
  }
  if(id&&/^[a-zA-Z0-9_-]{11}$/.test(id)){
   const raw=url.searchParams.get("t")??url.searchParams.get("start")??"";
   const time=/^\d+$/.test(raw)?Number(raw):/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(raw);
   const seconds=typeof time==="number"?time:time?Number(time[1]??0)*3600+Number(time[2]??0)*60+Number(time[3]??0):0;
   return {provider:"YouTube",id,url:`https://www.youtube.com/watch?v=${id}`,embed:`https://www.youtube-nocookie.com/embed/${id}?start=${Math.min(seconds,86400)}`,thumbnail:`https://i.ytimg.com/vi/${id}/hqdefault.jpg`};
  }
  if(["vimeo.com","www.vimeo.com","player.vimeo.com"].includes(host)){
   const match=/^\/(?:video\/)?(\d+)(?:\/([a-f0-9]+))?\/?$/.exec(url.pathname);
   if(match){const hash=match[2]??url.searchParams.get("h");return {provider:"Vimeo",id:match[1],url:value,embed:`https://player.vimeo.com/video/${match[1]}${hash&&/^[a-f0-9]+$/.test(hash)?`?h=${hash}`:""}`};}
  }
 }catch{}
 return null;
}
