import * as ts from "typescript";
import { ClassType, Ctx, ReflectedType } from "./types";
export declare function getReflect(ctx: Ctx): {
    reflectClass: (type: ts.InterfaceTypeWithDeclaredMembers) => ClassType;
    reflectType: (type: ts.Type) => ReflectedType;
};
