import type {AuthenticatedIdentity} from "../../../shared/auth";
export interface AuthGateway { getIdentity(accessToken:string):Promise<AuthenticatedIdentity|null>; }
export async function authenticateRequest(gateway:AuthGateway,accessToken:string|null){ if(!accessToken) return null; return gateway.getIdentity(accessToken); }