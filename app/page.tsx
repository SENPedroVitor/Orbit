import {redirect} from 'next/navigation';import Orbit from '@/components/orbit';import {getCurrentUser} from '@/lib/auth';
export const dynamic='force-dynamic';export default async function Home(){if(!await getCurrentUser())redirect('/login');return <Orbit/>;}
