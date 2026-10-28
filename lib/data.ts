import { serverSupabase } from "@/lib/supabase/server";
import { isConfigured } from "@/lib/utils";
import type { Leader, Tournament,Profile } from "@/lib/types";

export async function tournaments():Promise<Tournament[]> {
 const db=await serverSupabase();
 if(!db) return [];
 const {data,error}=await db.from("tournament_cards").select("*").order("starts_at",{ascending:true}).limit(60);
 if(error){console.error("tournaments",error.message);return [];}
 return (data??[]) as Tournament[];
}
export async function tournament(id:string):Promise<Tournament|null> {
 const db=await serverSupabase();
 if(!db)return null;
 const {data}=await db.from("tournament_cards").select("*").eq("id",id).maybeSingle();
 return data as Tournament|null;
}
export async function leaderboard():Promise<Leader[]>{
 const db=await serverSupabase();
 if(!db)return [];
 const {data,error}=await db.rpc("public_leaderboard",{max_rows:20});
 if(error){console.error("leaderboard",error.message);return [];}
 return (data??[]) as Leader[];
}
export async function currentProfile():Promise<Profile|null>{
 const db=await serverSupabase();
 if(!db)return null;
 const {data:{user}}=await db.auth.getUser();
 if(!user)return null;
 const {data}=await db.from("profiles").select("id,nickname,game_uid,role,created_at").eq("id",user.id).maybeSingle();
 return data as Profile|null;
}
export async function registrationsForUser(id:string) {
 const db=await serverSupabase();
 if(!db)return [];
 const {data}=await db.from("registrations").select("id,tournament_id,status,expires_at,created_at").eq("user_id",id).order("created_at",{ascending:false});
 return data??[];
}
export {isConfigured};
