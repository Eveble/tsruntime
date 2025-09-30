"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeReferenceSerializationKind = void 0;
var TypeReferenceSerializationKind;
(function (TypeReferenceSerializationKind) {
    TypeReferenceSerializationKind[TypeReferenceSerializationKind["Unknown"] = 0] = "Unknown";
    // should be emitted using a safe fallback.
    TypeReferenceSerializationKind[TypeReferenceSerializationKind["TypeWithConstructSignatureAndValue"] = 1] = "TypeWithConstructSignatureAndValue";
    // function that can be reached at runtime (e.g. a `class`
    // declaration or a `var` declaration for the static side
    // of a type, such as the global `Promise` type in lib.d.ts).
    TypeReferenceSerializationKind[TypeReferenceSerializationKind["VoidNullableOrNeverType"] = 2] = "VoidNullableOrNeverType";
    TypeReferenceSerializationKind[TypeReferenceSerializationKind["NumberLikeType"] = 3] = "NumberLikeType";
    TypeReferenceSerializationKind[TypeReferenceSerializationKind["StringLikeType"] = 4] = "StringLikeType";
    TypeReferenceSerializationKind[TypeReferenceSerializationKind["BooleanType"] = 5] = "BooleanType";
    TypeReferenceSerializationKind[TypeReferenceSerializationKind["ArrayLikeType"] = 6] = "ArrayLikeType";
    TypeReferenceSerializationKind[TypeReferenceSerializationKind["ESSymbolType"] = 7] = "ESSymbolType";
    TypeReferenceSerializationKind[TypeReferenceSerializationKind["Promise"] = 8] = "Promise";
    TypeReferenceSerializationKind[TypeReferenceSerializationKind["TypeWithCallSignature"] = 9] = "TypeWithCallSignature";
    // with call signatures.
    TypeReferenceSerializationKind[TypeReferenceSerializationKind["ObjectType"] = 10] = "ObjectType";
})(TypeReferenceSerializationKind || (exports.TypeReferenceSerializationKind = TypeReferenceSerializationKind = {}));
// export interface NewCallExpression {
//     expression: ts.LeftHandSideExpression;
//     typeArguments?: ts.NodeArray<ts.TypeNode>;
// }
//# sourceMappingURL=typescript-extended.js.map