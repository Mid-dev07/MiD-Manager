import {createClient,type SupabaseClient,type User} from "@supabase/supabase-js";
export function createAuthClient(url:string,publishableKey:string):SupabaseClient{return createClient(url,publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});}
export type AuthUser=User;