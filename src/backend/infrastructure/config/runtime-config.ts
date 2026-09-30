import {parseRuntimeConfig,type RuntimeConfig} from "../../../shared/config";
export function getRuntimeConfig(env:Record<string,string|undefined>):RuntimeConfig{return parseRuntimeConfig(env);}