import {describe,expect,it} from "vitest";
import {createApp} from "./app";

describe("auth request context",()=> {
  it("propagates authenticated identity into the auth context endpoint",async()=> {
    const app=createApp({
      async getIdentity(accessToken:string){
        expect(accessToken).toBe("test-token");
        return {userId:"user-123",email:"user@example.com"};
      },
    },"test");

    const response=await app.request("http://localhost/api/auth/context",{
      headers:{authorization:"Bearer test-token"},
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      user:{userId:"user-123",email:"user@example.com"},
    });
  });
});
