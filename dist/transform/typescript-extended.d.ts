import * as ts from 'typescript';
export declare enum TypeReferenceSerializationKind {
    Unknown = 0,// The TypeReferenceNode could not be resolved. The type name
    TypeWithConstructSignatureAndValue = 1,// The TypeReferenceNode resolves to a type with a constructor
    VoidNullableOrNeverType = 2,// The TypeReferenceNode resolves to a Void-like, Nullable, or Never type.
    NumberLikeType = 3,// The TypeReferenceNode resolves to a Number-like type.
    StringLikeType = 4,// The TypeReferenceNode resolves to a String-like type.
    BooleanType = 5,// The TypeReferenceNode resolves to a Boolean-like type.
    ArrayLikeType = 6,// The TypeReferenceNode resolves to an Array-like type.
    ESSymbolType = 7,// The TypeReferenceNode resolves to the ESSymbol type.
    Promise = 8,// The TypeReferenceNode resolved to the global Promise constructor symbol.
    TypeWithCallSignature = 9,// The TypeReferenceNode resolves to a Function type or a type
    ObjectType = 10
}
export interface EmitResolver {
    isReferencedAliasDeclaration(node: ts.Node, checkChildren?: boolean): boolean;
    hasGlobalName(name: string): boolean;
    getReferencedExportContainer(node: ts.Identifier, prefixLocals?: boolean): ts.SourceFile | ts.ModuleDeclaration | ts.EnumDeclaration;
    getReferencedImportDeclaration(node: ts.Identifier): ts.Declaration;
    getReferencedDeclarationWithCollidingName(node: ts.Identifier): ts.Declaration;
    getReferencedValueDeclaration(reference: ts.Identifier): ts.Declaration;
    getTypeReferenceSerializationKind(typeName: ts.EntityName, location?: ts.Node): TypeReferenceSerializationKind;
    isOptionalParameter(node: ts.ParameterDeclaration): boolean;
    getExternalModuleFileFromDeclaration(declaration: ts.ImportEqualsDeclaration | ts.ImportDeclaration | ts.ExportDeclaration | ts.ModuleDeclaration): SourceFile;
    getTypeReferenceDirectivesForEntityName(name: ts.EntityNameOrEntityNameExpression): string[];
    isLiteralConstDeclaration(node: ts.VariableDeclaration | ts.PropertyDeclaration | ts.PropertySignature | ts.ParameterDeclaration): boolean;
}
export interface Node {
    symbol?: ts.Symbol;
    original?: ts.Node;
}
export interface Identifier extends ts.Identifier, Node {
}
export interface ClassDeclaration extends ts.ClassDeclaration, Node {
}
export interface SourceFile extends ts.SourceFile, Node {
}
export interface PropertyDeclaration extends ts.PropertyDeclaration, Node {
}
export interface TransformationContext extends ts.TransformationContext {
    getEmitResolver(): EmitResolver;
}
