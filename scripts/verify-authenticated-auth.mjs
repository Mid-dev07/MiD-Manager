/* global process, fetch, console */
import {createClient} from "@supabase/supabase-js";

const supabaseUrl=process.env.SUPABASE_URL;
const publishableKey=process.env.SUPABASE_PUBLISHABLE_KEY;
const workerUrl=process.env.WORKER_URL??"http://127.0.0.1:8787";

if(!supabaseUrl||!publishableKey) throw new Error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY");

const client=createClient(supabaseUrl,publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const password="MiD-Bootstrap-Test-2026!";
const email=`bootstrap-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;

const anonymous=await fetch(`${workerUrl}/api/auth/context`);
if(anonymous.status!==401) throw new Error(`Anonymous auth check expected 401, got ${anonymous.status}`);
const anonymousBody=await anonymous.json();
if(anonymousBody?.error?.code!=="UNAUTHENTICATED") throw new Error("Anonymous response did not contain UNAUTHENTICATED");

const {data:signUpData,error:signUpError}=await client.auth.signUp({email,password});
if(signUpError) throw new Error(`Local sign-up failed: ${signUpError.message}`);

let session=signUpData.session;
let user=signUpData.user;
if(!session){
  const signedIn=await client.auth.signInWithPassword({email,password});
  if(signedIn.error||!signedIn.data.session||!signedIn.data.user) throw new Error(`Local sign-in failed: ${signedIn.error?.message??"missing session"}`);
  session=signedIn.data.session;
  user=signedIn.data.user;
}
if(!user||!session?.access_token) throw new Error("Authenticated Supabase session missing");

const {data:verified,error:verifyError}=await client.auth.getUser(session.access_token);
if(verifyError||!verified.user) throw new Error(`Supabase token verification failed: ${verifyError?.message??"missing user"}`);
if(verified.user.id!==user.id) throw new Error("Supabase user identity changed during token verification");

const response=await fetch(`${workerUrl}/api/auth/context`,{headers:{Authorization:`Bearer ${session.access_token}`}});
const body=await response.json();
if(response.status!==200) throw new Error(`Authenticated endpoint expected 200, got ${response.status}: ${JSON.stringify(body)}`);
if(body?.user?.userId!==user.id) throw new Error(`Identity mismatch: expected ${user.id}, got ${body?.user?.userId}`);
if(body?.user?.email!==user.email) throw new Error("Authenticated email identity mismatch");

await client.auth.signOut();

console.log("AUTHENTICATED_AUTH_VERIFICATION=PASS");
console.log(`test_user_id=${user.id}`);
console.log(`test_user_email=${user.email}`);
console.log(`access_token=${session.access_token.slice(0,12)}...<REDACTED>`);
console.log("anonymous_status=401");
console.log("authenticated_status=200");
console.log(`identity_user_id=${body.user.userId}`);
console.log(`identity_email=${body.user.email}`);
