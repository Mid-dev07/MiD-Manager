import {readFileSync,readdirSync,statSync} from "node:fs";
import {join,relative,resolve,dirname,extname} from "node:path";

export type ArchitectureLayer="transport"|"application"|"domain"|"infrastructure";

type ImportViolation={file:string;dependency:string;reason:string};

const sourceExtensions=[".ts",".tsx",".js",".jsx",".mts",".cts",".mjs",".cjs"];

const forbiddenDomainPackages=[
  /^hono$/,
  /^@hono\//,
  /^supabase$/,
  /^@supabase\//,
  /^cloudflare$/,
  /^@cloudflare\//,
  /^wrangler$/,
];

const importPattern=/(?:import\s+(?:type\s+)?[\s\S]*?\s+from\s*|export\s+(?:type\s+)?[\s\S]*?\s+from\s*|import\s*\()\s*["']([^"']+)["']/g;

function collectFiles(directory:string):string[]{
  return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
    const path=join(directory,entry.name);
    if(entry.name==="node_modules"||entry.name.startsWith(".")) return [];
    if(entry.isDirectory()) return collectFiles(path);
    return sourceExtensions.includes(extname(entry.name))?[path]:[];
  });
}

function readTsconfigPaths(root:string):Map<string,string[]>{
  const configPath=join(root,"tsconfig.json");
  try{
    const config=JSON.parse(readFileSync(configPath,"utf8")) as {compilerOptions?:{baseUrl?:string;paths?:Record<string,string[]>}};
    const baseUrl=resolve(root,config.compilerOptions?.baseUrl??".");
    return new Map(Object.entries(config.compilerOptions?.paths??{}).map(([key,values])=>[
      key,
      values.map(value=>resolve(baseUrl,value.replace(/\*$/,""))),
    ]));
  }catch{return new Map();}
}

function resolveImport(specifier:string,fromFile:string,root:string,paths:Map<string,string[]>):string|null{
  const candidates:string[]=[];
  if(specifier.startsWith(".")) candidates.push(resolve(dirname(fromFile),specifier));
  for(const [pattern,targets] of paths){
    const prefix=pattern.endsWith("*")?pattern.slice(0,-1):pattern;
    if(specifier.startsWith(prefix)){
      const suffix=specifier.slice(prefix.length);
      candidates.push(...targets.map(target=>resolve(target,suffix)));
    }
  }
  for(const candidate of candidates){
    for(const extension of sourceExtensions){
      const file=candidate.endsWith(extension)?candidate:candidate+extension;
      try{if(statSync(file).isFile()) return file;}catch{}
    }
    for(const extension of sourceExtensions){
      const file=join(candidate,"index"+extension);
      try{if(statSync(file).isFile()) return file;}catch{}
    }
  }
  return null;
}

function layerOf(file:string,backendRoot:string):ArchitectureLayer|null{
  const path=relative(backendRoot,file).replaceAll("\\","/");
  for(const layer of ["transport","application","domain","infrastructure"] as const){
    if(path===layer||path.startsWith(layer+"/")) return layer;
  }
  return null;
}

export function inspectArchitecture(backendRoot:string):ImportViolation[]{
  const root=resolve(backendRoot);
  const paths=readTsconfigPaths(dirname(root));
  const violations:ImportViolation[]=[];
  for(const file of collectFiles(root)){
    const layer=layerOf(file,root);
    if(!layer) continue;
    const source=readFileSync(file,"utf8");
    for(const match of source.matchAll(importPattern)){
      const specifier=match[1];
      if(layer==="domain" && forbiddenDomainPackages.some(pattern=>pattern.test(specifier))){
        violations.push({file,dependency:specifier,reason:"domain imports forbidden infrastructure/transport package"});
      }
      const resolved=resolveImport(specifier,file,root,paths);
      if(!resolved) continue;
      const dependencyLayer=layerOf(resolved,root);
      if(!dependencyLayer) continue;
      const allowed=
        layer==="transport" ? dependencyLayer==="application" :
        layer==="application" ? dependencyLayer==="domain" :
        layer==="domain" ? dependencyLayer==="domain" :
        true;
      if(!allowed){
        violations.push({file,dependency:resolved,reason:`${layer} must not depend on ${dependencyLayer}`});
      }
    }
  }
  return violations;
}
