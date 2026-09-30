import {describe,expect,it} from "vitest";
import {createApp} from "./app";
import type {AuthGateway} from "../application/auth/authenticate-request";
import type {ProfileRepository} from "../application/profile/profile-repository";

const userId="11111111-1111-1111-1111-111111111111";
const otherUserId="22222222-2222-2222-2222-222222222222";

function repositoryForOwner():ProfileRepository{
  let profile=null;
  return {
    async findByUserId(id){return id===userId?profile:null;},
    async create(value){profile=value;return value;},
    async update(value){if(!profile||value.toProps().userId!==userId)return null;profile=value;return value;},
  };
}

function gateway():AuthGateway{
  return {async getIdentity(token){
    return token==="owner-token"?{userId,email:"owner@example.test"}:token==="other-token"?{userId:otherUserId,email:"other@example.test"}:null;
  }};
}

describe("Profile API",()=>{
  it("returns 401 for anonymous GET",async()=>{
    const response=await createApp(gateway(),"test",repositoryForOwner()).request("/api/profile");
    expect(response.status).toBe(401);
  });

  it("returns and updates the authenticated user's profile",async()=>{
    const app=createApp(gateway(),"test",repositoryForOwner());
    const first=await app.request("/api/profile",{headers:{Authorization:"Bearer owner-token"}});
    expect(first.status).toBe(200);
    expect((await first.json()).profile.displayName).toBeNull();
    const updated=await app.request("/api/profile",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer owner-token"},body:JSON.stringify({displayName:"Alice"})});
    expect(updated.status).toBe(200);
    expect((await updated.json()).profile.displayName).toBe("Alice");
  });

  it("rejects ownership manipulation",async()=>{
    const app=createApp(gateway(),"test",repositoryForOwner());
    await app.request("/api/profile",{headers:{Authorization:"Bearer owner-token"}});
    const response=await app.request("/api/profile",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer owner-token"},body:JSON.stringify({userId:otherUserId,displayName:"Nope"})});
    expect(response.status).toBe(400);
  });

  it("does not allow another authenticated identity to update the owner profile",async()=>{
    const app=createApp(gateway(),"test",repositoryForOwner());
    await app.request("/api/profile",{headers:{Authorization:"Bearer owner-token"}});
    const response=await app.request("/api/profile",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer other-token"},body:JSON.stringify({displayName:"Hacked"})});
    expect(response.status).toBe(404);
  });
});
