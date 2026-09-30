import {Hono} from "hono";
import type {AuthGateway} from "../application/auth/authenticate-request";
import {getHealth} from "../application/health/get-health";
import {createRequestContextMiddleware,type AppVariables} from "./middleware/context";
import {errorHandler} from "./error-handler";
export function createApp(gateway:AuthGateway,environment:string){const app=new Hono<{Variables:AppVariables}>();app.onError(errorHandler);app.use("*",createRequestContextMiddleware(gateway));app.get("/api/health",c=>c.json(getHealth(environment)));app.get("/api/auth/context",c=>{const context=c.get("requestContext");if(!context.identity)return c.json({error:{code:"UNAUTHENTICATED",message:"Authentication required"}},401);return c.json({user:context.identity});});return app;}