import {NextRequest,NextResponse} from "next/server";
import {serverSupabase} from "@/lib/supabase/server";
export async function GET(request:NextRequest){
 const code=new URL(request.url).searchParams.get("code");
 const db=await serverSupabase();
 if(code && db){
  const {error}=await db.auth.exchangeCodeForSession(code);
  if(!error){const next=new URL(request.url).searchParams.get("next");return NextResponse.redirect(new URL(next==="/actualizar-clave"?next:"/perfil",request.url));}
 }
 return NextResponse.redirect(new URL("/acceso?error="+encodeURIComponent("No se pudo verificar el enlace. Inténtalo nuevamente."),request.url));
}
