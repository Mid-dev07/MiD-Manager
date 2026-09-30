export interface HealthStatus { status:"ok"; environment:string; }
export function getHealth(environment:string):HealthStatus{return {status:"ok",environment};}