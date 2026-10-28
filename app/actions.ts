"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {z} from "zod";
import {serverSupabase} from "@/lib/supabase/server";
type DB=NonNullable<Awaited<ReturnType<typeof serverSupabase>>>;
function fail(target:string,message:string):never{redirect(target+"?error="+encodeURIComponent(message));}
async function requireUser(){const db=await serverSupabase();if(!db)fail("/acceso","Configura Supabase antes de continuar");const {data:{user},error}=await db.auth.getUser();if(error||!user)fail("/acceso","Inicia sesión para continuar");return {db:db as DB,user};}
async function requireAdmin(){const {db,user}=await requireUser();const {data}=await db.from("profiles").select("role").eq("id",user.id).single();if(data?.role!=="admin")fail("/perfil","Acceso restringido");return {db,user};}
const emailSchema=z.email().max(180);
const passSchema=z.string().min(8).max(128);
export async function signIn(form:FormData){
 const email=emailSchema.safeParse(form.get("email"));const password=passSchema.safeParse(form.get("password"));if(!email.success||!password.success)fail("/acceso","Verifica tu correo y contraseña");
 const db=await serverSupabase();if(!db)fail("/acceso","Supabase no está configurado");
 const {error}=await db.auth.signInWithPassword({email:email.data,password:password.data});
 if(error)fail("/acceso","No se pudo iniciar sesión. Revisa las credenciales o confirma el correo.");
 revalidatePath("/","layout");redirect("/perfil");
}
export async function signUp(form:FormData){
 const email=emailSchema.safeParse(form.get("email"));const password=passSchema.safeParse(form.get("password"));const nickname=z.string().min(3).max(24).regex(/^[a-zA-Z0-9_-]+$/).safeParse(form.get("nickname"));
 if(!email.success||!password.success||!nickname.success)fail("/acceso","Correo válido, contraseña de 8+ caracteres y nickname de 3 a 24 letras, números, guion o guion bajo.");
 const db=await serverSupabase();if(!db)fail("/acceso","Supabase no está configurado");
 const origin=process.env.NEXT_PUBLIC_SITE_URL??"http://localhost:3000";
 const {error}=await db.auth.signUp({email:email.data,password:password.data,options:{emailRedirectTo:origin+"/auth/callback",data:{nickname:nickname.data}}});
 if(error)fail("/acceso","Registro no completado. Prueba otro nickname o correo.");
 redirect("/acceso?notice="+encodeURIComponent("Cuenta creada. Revisa tu correo si se solicita confirmación."));
}
export async function signOut(){const db=await serverSupabase();if(db)await db.auth.signOut();revalidatePath("/","layout");redirect("/");}
export async function updateProfile(form:FormData){
 const {db,user}=await requireUser();const nickname=z.string().min(3).max(24).regex(/^[a-zA-Z0-9_-]+$/).safeParse(form.get("nickname"));
 const uid=z.string().max(30).regex(/^[0-9]*$/).safeParse(form.get("game_uid"));if(!nickname.success||!uid.success)fail("/perfil","Nickname o UID inválido");
 const {error}=await db.from("profiles").update({nickname:nickname.data,game_uid:uid.data||null}).eq("id",user.id);
 if(error)fail("/perfil","No se pudo actualizar el perfil. El nickname podría estar ocupado.");
 revalidatePath("/perfil");revalidatePath("/","layout");redirect("/perfil?notice=Perfil+actualizado");
}
export async function reserveSpot(form:FormData){
 const id=z.uuid().safeParse(form.get("tournament_id"));if(!id.success)fail("/torneos","Torneo inválido");
 const {db}=await requireUser();
 const {data,error}=await db.rpc("reserve_free_tournament",{t_id:id.data});
 if(error)fail("/torneos/"+id.data,error.message.slice(0,180));
 revalidatePath("/torneos");revalidatePath("/torneos/"+id.data);revalidatePath("/");
 redirect("/torneos/"+id.data+"?notice="+encodeURIComponent(data==="waitlisted"?"Te añadimos a la lista de espera.":"Tu plaza gratuita quedó confirmada."));
}
export async function cancelSpot(form:FormData){
 const id=z.uuid().safeParse(form.get("tournament_id"));if(!id.success)fail("/torneos","Torneo inválido");
 const {db}=await requireUser();const {error}=await db.rpc("cancel_my_registration",{t_id:id.data});if(error)fail("/torneos/"+id.data,error.message);
 revalidatePath("/torneos");revalidatePath("/torneos/"+id.data);redirect("/torneos/"+id.data+"?notice=Inscripción+cancelada");
}
export async function createTournament(form:FormData){
 const {db,user}=await requireAdmin();
 const schema=z.object({title:z.string().trim().min(5).max(90),description:z.string().max(1000),starts_at:z.string().min(12),deadline:z.string().min(12),min_players:z.coerce.number().int().min(2).max(100),max_players:z.coerce.number().int().min(2).max(100),prize:z.coerce.number().min(0).max(100000),entry:z.coerce.number().min(0).max(100000),modality:z.string().max(60),rules:z.string().max(4000)});
 const v=schema.safeParse(Object.fromEntries(form));if(!v.success)fail("/admin","Datos de torneo inválidos");
 const x=v.data;if(x.min_players>x.max_players||new Date(x.deadline)>=new Date(x.starts_at))fail("/admin","Revisa cupos y plazo: el cierre debe ser anterior al inicio.");
 const {data:g}=await db.from("games").select("id").eq("slug","free-fire").single();if(!g)fail("/admin","Falta instalar la migración SQL");
 const slug="dz-"+Date.now();
 const {error}=await db.from("tournaments").insert({game_id:g.id,title:x.title,slug,description:x.description,starts_at:new Date(x.starts_at).toISOString(),registration_deadline:new Date(x.deadline).toISOString(),min_players:x.min_players,max_players:x.max_players,prize_cents:Math.round(x.prize*100),entry_cents:Math.round(x.entry*100),modality:x.modality,rules:x.rules,status:"draft",created_by:user.id});
 if(error)fail("/admin","No fue posible crear el torneo: "+error.message);
 revalidatePath("/admin");redirect("/admin?notice=Torneo+creado+como+borrador");
}
export async function changeTournamentStatus(form:FormData){
 const {db,user}=await requireAdmin();const id=z.uuid().safeParse(form.get("tournament_id"));
 const status=z.enum(["draft","open","confirmed","full","in_progress","finished","cancelled"]).safeParse(form.get("status"));
 if(!id.success||!status.success)fail("/admin","Solicitud inválida");
 const {error}=await db.from("tournaments").update({status:status.data}).eq("id",id.data);
 if(error)fail("/admin","No se pudo cambiar el estado");
 await db.from("audit_logs").insert({actor_id:user.id,action:"change_tournament_status",entity_id:id.data,details:{status:status.data}});
 revalidatePath("/admin");revalidatePath("/torneos");revalidatePath("/torneos/"+id.data);redirect("/admin?notice=Estado+actualizado");
}
export async function saveRoom(form:FormData){
 const {db,user}=await requireAdmin();
 const id=z.uuid().safeParse(form.get("tournament_id"));const roomId=z.string().trim().min(2).max(100).safeParse(form.get("room_id"));const secret=z.string().trim().min(4).max(150).safeParse(form.get("room_secret"));
 const opens=z.string().min(12).safeParse(form.get("access_opens_at"));
 if(!id.success||!roomId.success||!secret.success||!opens.success)fail("/admin","Datos de sala inválidos");
 const {error}=await db.from("rooms").upsert({tournament_id:id.data,room_id:roomId.data,room_secret:secret.data,access_opens_at:new Date(opens.data).toISOString()},{onConflict:"tournament_id"});
 if(error)fail("/admin","Error guardando sala: "+error.message);
 await db.from("audit_logs").insert({actor_id:user.id,action:"save_room",entity_id:id.data,details:{updated:true}});
 revalidatePath("/admin");revalidatePath("/torneos/"+id.data);redirect("/admin?notice=Sala+guardada");
}
export async function publishResult(form:FormData){
 const {db,user}=await requireAdmin();
 const tournamentId=z.uuid().safeParse(form.get("tournament_id"));const userId=z.uuid().safeParse(form.get("user_id"));
 const rank=z.coerce.number().int().min(1).max(100).safeParse(form.get("placement"));const kills=z.coerce.number().int().min(0).max(99).safeParse(form.get("kills"));
 if(!tournamentId.success||!userId.success||!rank.success||!kills.success)fail("/admin","Resultado inválido");
 const points=Math.max(0,21-rank.data)+kills.data*2;
 const {error}=await db.from("results").upsert({tournament_id:tournamentId.data,user_id:userId.data,placement:rank.data,kills:kills.data,points,verified_by:user.id,verified_at:new Date().toISOString()},{onConflict:"tournament_id,user_id"});
 if(error)fail("/admin","No se pudo publicar el resultado: "+error.message);
 await db.from("audit_logs").insert({actor_id:user.id,action:"publish_result",entity_id:tournamentId.data,details:{user_id:userId.data,placement:rank.data,kills:kills.data}});
 revalidatePath("/rankings");revalidatePath("/admin");redirect("/admin?notice=Resultado+verificado");
}

export async function resolveDispute(form:FormData){
 const {db,user}=await requireAdmin();
 const id=z.uuid().safeParse(form.get("dispute_id"));
 const status=z.enum(["resolved","rejected"]).safeParse(form.get("status"));
 const resolution=z.string().min(5).max(1000).safeParse(form.get("resolution"));
 if(!id.success||!status.success||!resolution.success)fail("/admin","Resolución inválida");
 const {error}=await db.from("disputes").update({status:status.data,resolution:resolution.data}).eq("id",id.data);
 if(error)fail("/admin","No se pudo actualizar la reclamación");
 await db.from("audit_logs").insert({actor_id:user.id,action:"resolve_dispute",entity_id:id.data,details:{status:status.data}});
 revalidatePath("/admin");redirect("/admin?notice=Reclamación+actualizada");
}
