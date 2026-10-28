export type TournamentStatus = "draft" | "open" | "confirmed" | "full" | "in_progress" | "finished" | "cancelled";
export type Role = "player" | "moderator" | "admin";
export type Game = { id: string; slug: string; name: string };
export type Tournament = {
 id:string; game_id:string; title:string; slug:string; description:string|null;
 starts_at:string; registration_deadline:string; min_players:number; max_players:number;
 prize_cents:number; entry_cents:number; status:TournamentStatus;
 modality:string; rules:string|null; created_at:string;
 game?: {name:string;slug:string}|null; registered_count?:number;
};
export type Profile = { id:string;nickname:string;game_uid:string|null;role:Role;is_public:boolean;created_at:string };
export type Leader = { nickname:string;points:number;wins:number;kills:number;played:number };
export type Registration = {id:string;user_id:string;tournament_id:string;status:"reserved"|"confirmed"|"cancelled"|"waitlisted";expires_at:string|null};
