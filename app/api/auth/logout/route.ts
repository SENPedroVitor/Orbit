import {NextResponse} from 'next/server';import {validOrigin} from '@/lib/auth';
export async function POST(request:Request){if(!validOrigin(request))return NextResponse.json({error:'Origem inválida.'},{status:403});const response=NextResponse.json({ok:true});response.cookies.set('orbit_session','',{httpOnly:true,sameSite:'strict',maxAge:0,path:'/'});return response;}
