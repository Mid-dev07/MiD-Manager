export interface AuthenticatedIdentity { userId:string; email:string|null; }
export interface RequestContext { requestId:string; identity:AuthenticatedIdentity|null; }
