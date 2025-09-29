import * as ts from "typescript";
import * as Types from "../runtime/publicTypes";
import { TypeKind } from "../runtime/publicTypes";
export { TypeKind };
export type ScopeType = ts.SourceFile | ts.CaseBlock | ts.ModuleBlock | ts.Block;
export declare class Ctx {
    readonly checker: ts.TypeChecker;
    readonly node: ts.Node;
    readonly currentScope: ScopeType;
    readonly markReferenced: undefined | ((symb: ts.Symbol) => void);
    constructor(checker: ts.TypeChecker, node: ts.Node, currentScope: ScopeType, markReferenced: undefined | ((symb: ts.Symbol) => void));
    reportUnknownType: (type: ts.Type) => void;
    reportWarning: (msg: string) => void;
}
export type ReflectedType = ClassType | ObjectType | TupleType | ReferenceType | UnionType | Override2<Types.FunctionType> | Override2<Types.StringLiteralType> | Override2<Types.NumberLiteralType> | Override2<Types.SimpleTypes>;
type _Override<T, O> = Pick<T, Exclude<keyof T, keyof O>> & O;
type Override<T, O> = _Override<T, O & {
    initializer?: ts.Expression;
}>;
type Override2<T> = Override<T, {}>;
type Properties = Array<{
    name: ts.PropertyName;
    type: ReflectedType;
    modifiers: Types.ModifierFlags;
}>;
export type ObjectType = Override<Types.ObjectType, {
    properties: Properties;
}>;
export type TupleType = Override<Types.TupleType, {
    elementTypes: ReflectedType[];
}>;
export type UnionType = Override<Types.UnionType, {
    types: ReflectedType[];
}>;
export type ReferenceType = Override<Types.ReferenceType, {
    arguments: ReflectedType[];
}>;
export interface ConstructorParameter {
    name: string;
    modifiers: ts.ModifierFlags;
    type: ReflectedType;
}
export interface Constructor {
    modifiers: ts.ModifierFlags;
    parameters: ConstructorParameter[];
}
export type Constructors = Array<Constructor>;
export type ClassType = Override<Types.ClassType, {
    properties: Properties;
    constructors: Constructors;
    extends?: ReflectedType;
}>;
