import {describe,expect,it} from "vitest";
import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {inspectArchitecture} from "./dependency-guard";

describe("architecture guardrails",()=>{
  it("enumerates actual domain sources and rejects forbidden external dependencies",()=>{
    const root=mkdtempSync(join(tmpdir(),"mid-architecture-"));
    try{
      mkdirSync(join(root,"domain"),{recursive:true});
      writeFileSync(join(root,"domain","valid.ts"),"export type DomainId=string;");
      writeFileSync(join(root,"domain","forbidden.ts"),'import {Hono} from "hono"; export const probe=Hono;');
      const violations=inspectArchitecture(root);
      expect(violations.some(v=>v.file.endsWith("forbidden.ts")&&v.dependency==="hono")).toBe(true);
    }finally{rmSync(root,{recursive:true,force:true});}
  });

  it("passes the repository source tree when layer dependencies are valid",()=>{
    const violations=inspectArchitecture(join(process.cwd(),"src/backend"));
    expect(violations).toEqual([]);
  });

  it("verifies the canonical direction transport -> application -> domain",()=>{
    const root=mkdtempSync(join(tmpdir(),"mid-architecture-direction-"));
    try{
      for(const layer of ["transport","application","domain","infrastructure"]) mkdirSync(join(root,layer),{recursive:true});
      writeFileSync(join(root,"domain","domain.ts"),"export const domain=true;");
      writeFileSync(join(root,"application","application.ts"),'import {domain} from "../domain/domain"; export {domain};');
      writeFileSync(join(root,"transport","transport.ts"),'import {domain} from "../application/application"; export {domain};');
      writeFileSync(join(root,"infrastructure","adapter.ts"),'import {domain} from "../domain/domain"; export {domain};');
      expect(inspectArchitecture(root)).toEqual([]);
    }finally{rmSync(root,{recursive:true,force:true});}
  });

  it("fails when a temporary fixture violates a layer boundary without touching production sources",()=>{
    const root=mkdtempSync(join(tmpdir(),"mid-architecture-boundary-"));
    try{
      for(const layer of ["transport","application","domain","infrastructure"]) mkdirSync(join(root,layer),{recursive:true});
      writeFileSync(join(root,"domain","domain.ts"),'import {adapter} from "../infrastructure/adapter"; export {adapter};');
      writeFileSync(join(root,"infrastructure","adapter.ts"),"export const adapter=true;");
      const violations=inspectArchitecture(root);
      expect(violations.some(v=>v.reason==="domain must not depend on infrastructure")).toBe(true);
    }finally{rmSync(root,{recursive:true,force:true});}
  });
});
