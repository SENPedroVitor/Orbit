"use client";
import { useState } from "react";
import { Play, ExternalLink, Video as VideoIcon } from "lucide-react";
import type { Video } from "@/lib/video";
export function VideoPreview({video,title}:{video:Video;title?:string}){
 const [playing,setPlaying]=useState(false);
 const [imageFailed,setImageFailed]=useState(false);
 return <div className="video-card">
  {playing?<iframe src={video.embed} title={title||`Vídeo do ${video.provider}`} loading="lazy" allow="fullscreen; picture-in-picture; encrypted-media" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:<button className="video-cover" type="button" onClick={()=>setPlaying(true)} aria-label={`Carregar vídeo do ${video.provider}`}>
   {video.thumbnail&&!imageFailed?<img src={video.thumbnail} alt="Prévia do vídeo" loading="lazy" onError={()=>setImageFailed(true)}/>:<VideoIcon size={40}/>}
   <span className="video-play"><Play size={23} fill="currentColor"/></span><span className="video-provider">{video.provider}</span>
  </button>}
  <div className="video-caption"><strong>{title||`Vídeo do ${video.provider}`}</strong><a href={video.url} target="_blank" rel="noopener noreferrer">Abrir no {video.provider}<ExternalLink size={14}/></a></div>
 </div>;
}
