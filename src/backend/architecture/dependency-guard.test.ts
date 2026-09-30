import {describe,expect,it} from "vitest";
import {mkdtempSync,rmSync,mkdirSync,writeFileSync,readFileSync,readdirSync,statSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,relative,resolve,dirname,extname} from "node:path";
import * as ts from "typescript";

type Layer="transport"|"application"|"domain"|"infrastructure";
type Violation={file:string;dependency:string;reason:string};

const extensions=[".ts",".tsx",".js",".jsx",".mts",".cts",".mjs",".cjs"];
const forbiddenDomainPackages=[/^hono$/,/^@hono\//,/^supabase$/,/^@supabase\//,/^cloudflare$/,/^@cloudflare\//,/^wrangler$/];
const layerNames=["transport","application","domain","infrastructure"] as const;

function sourceFiles(directory:string):string[]{
  return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
    const path=join(directory,entry.name);
    if(entry.name==="node_modules"||entry.name.startsWith(".")) return [];
    if(entry.isDirectory()) return sourceFiles(path);
    return extensions.includes(extname(entry.name))?[path]:[];
  });
}

function findTsconfig(start:string):string|null{
  let current=resolve(start);
  while(true){
    const candidate=join(current,"tsconfig.json");
    try{if(statSync(candidate).isFile()) return candidate;}catch{return null;}
    const parent=dirname(current);
    if(parent===current) return null;
    current=parent;
  }
}

function pathMappings(start:string):Map<string,string[]>{
  const configPath=findTsconfig(start);
  if(!configPath) return new Map();
  try{
    const raw=JSON.parse(readFileSync(configPath,"utf8")) as {compilerOptions?:{baseUrl?:string;paths?:Record<string,string[]>}};
    const baseUrl=resolve(dirname(configPath),raw.compilerOptions?.baseUrl??".");
    return new Map(Object.entries(raw.compilerOptions?.paths??{}).map(([key,values])=>[
      key,
      values.map(value=>resolve(baseUrl,value.replace(/\*$/,""))),
    ]));
  }catch{return new Map();}
}

function resolveImport(specifier:string,fromFile:string,root:string,mappings:Map<string,string[]>):string|null{
  const candidates:string[]=[];
  if(specifier.startsWith(".")) candidates.push(resolve(dirname(fromFile),specifier));
  for(const [pattern,targets] of mappings){
    const prefix=pattern.endsWith("*")?pattern.slice(0,-1):pattern;
    if(specifier.startsWith(prefix)){
      const suffix=specifier.slice(prefix.length);
      candidates.push(...targets.map(target=>resolve(target,suffix)));
    }
  }
  for(const candidate of candidates){
    for(const extension of extensions){
      const path=candidate.endsWith(extension)?candidate:candidate+extension;
      try{if(statSync(path).isFile()) return path;}catch{ /* candidate may not exist */ }
    }
    for(const extension of extensions){
      const path=join(candidate,"index"+extension);
      try{if(statSync(path).isFile()) return path;}catch{}
    }
  }
  return null;
}

function layerOf(file:string,root:string):Layer|null{
  const path=relative(root,file).replaceAll("\\","/");
  return layerNames.find(layer=>path===layer||path.startsWith(layer+"/"))??null;
}

function importsOf(file:string):string[]{
  const source=ts.createSourceFile(file,readFileSync(file,"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  const imports:string[]=[];
  const visit=(node:ts.Node)=>{
    if(ts.isImportDeclaration(node)||ts.isExportDeclaration(node)){
      if(node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier)) imports.push(node.moduleSpecifier.text);
    }else if(ts.isCallExpression(node)&&node.arguments.length===1&&ts.isStringLiteral(node.arguments[0])){
      if(node.expression.kind===ts.SyntaxKind.ImportKeyword||node.expression.getText(source)==="require") imports.push(node.arguments[0].text);
    }
    ts.forEachChild(node,visit);
  };
  visit(source);
  return imports;
}

function inspectArchitecture(backendRoot:string):Violation[]{
  const root=resolve(backendRoot);
  const mappings=pathMappings(root);
  const violations:Violation[]=[];
  for(const file of sourceFiles(root)){
    const layer=layerOf(file,root);
    if(!layer) continue;
    for(const specifier of importsOf(file)){
      if(layer==="domain"&&forbiddenDomainPackages.some(pattern=>pattern.test(specifier))){
        violations.push({file,dependency:specifier,reason:"domain imports forbidden infrastructure/transport package"});
      }
      const resolved=resolveImport(specifier,file,root,mappings);
      if(!resolved) continue;
      const dependencyLayer=layerOf(resolved,root);
      if(!dependencyLayer) continue;
      const allowed=
        layer==="transport" ? dependencyLayer==="application" :
        layer==="application" ? dependencyLayer==="domain" :
        layer==="domain" ? dependencyLayer==="domain" :
        true;
      if(!allowed) violations.push({file,dependency:resolved,reason:`${layer} must not depend on ${dependencyLayer}`});
    }
  }
  return violations;
}

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
    expect(inspectArchitecture(join(process.cwd(),"src/backend"))).toEqual([]);
  });

  it("verifies the canonical direction transport -> application -> domain",()=>{
    const root=mkdtempSync(join(tmpdir(),"mid-architecture-direction-"));
    try{
      for(const layer of layerNames) mkdirSync(join(root,layer),{recursive:true});
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
      for(const layer of layerNames) mkdirSync(join(root,layer),{recursive:true});
      writeFileSync(join(root,"domain","domain.ts"),'import {adapter} from "../infrastructure/adapter"; export {adapter};');
      writeFileSync(join(root,"infrastructure","adapter.ts"),"export const adapter=true;");
      const violations=inspectArchitecture(root);
      expect(violations.some(v=>v.reason==="domain must not depend on infrastructure")).toBe(true);
    }finally{rmSync(root,{recursive:true,force:true});}
  });
});
