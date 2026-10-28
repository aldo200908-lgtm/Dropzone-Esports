import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const runtime="nodejs";
export async function GET(request:NextRequest){
 const secret=process.env.CRON_SECRET;
 if(!secret||request.headers.get("authorization")!=="Bearer "+secret){
  return NextResponse.json({error:"Unauthorized"},{status:401});
 }
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const service=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!service)return NextResponse.json({error:"Server configuration missing"},{status:503});
 const db=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
 const {data,error}=await db.rpc("reconcile_expired_tournaments");
 if(error)return NextResponse.json({error:"Reconciliation failed"},{status:500});
 return NextResponse.json({ok:true,updated:data});
}
