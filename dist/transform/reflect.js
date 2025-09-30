"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReflect = void 0;
var ts = require("typescript");
var types_1 = require("./types");
var Normalizers;
(function (Normalizers) {
    function normalizeBooleans(types) {
        var hasFalse = false;
        var hasTrue = false;
        var hasBoolean = false;
        for (var _i = 0, types_2 = types; _i < types_2.length; _i++) {
            var type = types_2[_i];
            switch (type.kind) {
                case types_1.TypeKind.FalseLiteral:
                    hasFalse = true;
                    break;
                case types_1.TypeKind.TrueLiteral:
                    hasTrue = true;
                    break;
                case types_1.TypeKind.Boolean:
                    hasBoolean = true;
                    break;
            }
        }
        if (hasBoolean || (hasTrue && hasFalse)) {
            return [{ kind: types_1.TypeKind.Boolean }];
        }
        return types;
    }
    function normalizeUnion(types) {
        var booleans = [];
        var okTypes = [];
        types.forEach(function (type) {
            switch (type.kind) {
                case types_1.TypeKind.FalseLiteral:
                case types_1.TypeKind.TrueLiteral:
                case types_1.TypeKind.Boolean:
                    booleans.push(type);
                    break;
                default:
                    okTypes.push(type);
                    break;
            }
        });
        var normalizedTypes = [];
        if (booleans.length > 0) {
            normalizedTypes.push.apply(normalizedTypes, normalizeBooleans(booleans));
        }
        return okTypes.concat(normalizedTypes);
    }
    Normalizers.normalizeUnion = normalizeUnion;
})(Normalizers || (Normalizers = {}));
function getReflect(ctx) {
    function serializeUnion(type) {
        var nestedTypes = type.types.map(function (t) { return reflectType(t); });
        var normalizedTypes = Normalizers.normalizeUnion(nestedTypes);
        return { kind: types_1.TypeKind.Union, types: normalizedTypes };
    }
    function serializeReference(type) {
        try {
            var typeArgs = type.typeArguments;
            var allTypes = [];
            if (typeArgs !== undefined) {
                allTypes = typeArgs.map(function (t) {
                    var reflectedType = reflectType(t);
                    return reflectedType || { kind: types_1.TypeKind.Unknown2 };
                });
            }
            var target = type.target;
            if (target.objectFlags & ts.ObjectFlags.Tuple) {
                return { kind: types_1.TypeKind.Tuple, elementTypes: allTypes };
            }
            var symbol = target.getSymbol();
            if (symbol.valueDeclaration === undefined) {
                return {
                    kind: types_1.TypeKind.Object,
                    name: symbol.getName(),
                    // arguments: allTypes,
                    properties: []
                };
            }
            else {
                var typeName = getIdentifierForSymbol(target);
                return { kind: types_1.TypeKind.Reference, arguments: allTypes, type: typeName };
            }
        }
        catch (error) {
            // console.warn('serializeReference failed:', (error as Error).message);
            return { kind: types_1.TypeKind.Unknown2 };
        }
    }
    function getIdentifierForSymbol(type) {
        var name;
        var typenode = ctx.checker.typeToTypeNode(type, ctx.node, undefined); //todo not sure
        switch (typenode.kind) {
            case ts.SyntaxKind.TypeReference:
                var typename = typenode.typeName;
                name = typename.text;
                var origSymb = type.getSymbol();
                if (origSymb.getFlags() & ts.SymbolFlags.Alias) {
                    origSymb = ctx.checker.getAliasedSymbol(origSymb);
                }
                if (ctx.markReferenced) {
                    ctx.markReferenced(origSymb);
                }
                break;
            default:
                name = type.getSymbol().getName();
        }
        var typeIdentifier = ts.factory.createIdentifier(name);
        typeIdentifier.flags &= ~ts.NodeFlags.Synthesized;
        typeIdentifier.parent = ctx.currentScope;
        return typeIdentifier;
    }
    function getPropertyName(symbol) {
        var valueDeclaration = symbol.valueDeclaration;
        if (valueDeclaration) {
            // if (!ts.isPropertySignature(valueDeclaration) && !ts.isPropertyDeclaration(valueDeclaration)) {
            // throw new Error("not prop signature");
            // }
            return valueDeclaration.name;
        }
        //@ts-ignore
        var nameType = symbol.nameType;
        // PATCH: Handle undefined nameType gracefully
        if (!nameType) {
            // console.warn('getPropertyName: nameType is undefined for symbol:', (symbol as any).escapedName || symbol.name || 'unknown');
            // Fallback: create identifier from symbol name
            var symbolName = symbol.escapedName || symbol.name || 'unknown';
            return ts.factory.createIdentifier(String(symbolName));
        }
        try {
            var nameSymb = nameType.getSymbol();
            if (nameSymb) {
                return nameSymb.valueDeclaration;
            }
            else {
                //@ts-expect-error
                return ts.factory.createLiteral(nameType.value);
            }
        }
        catch (error) {
            // console.warn('getPropertyName: getSymbol() failed:', (error as Error).message);
            var symbolName = symbol.escapedName || symbol.name || 'unknown';
            return ts.factory.createIdentifier(String(symbolName));
        }
    }
    function serializeInitializer(decl) {
        return decl.initializer
            ? ts.factory.createArrowFunction(undefined, undefined, [], undefined, undefined, decl.initializer)
            : undefined;
    }
    function serializePropertySymbol(sym) {
        try {
            var decl = sym.declarations[0];
            var type = ctx.checker.getTypeOfSymbolAtLocation(sym, ctx.node);
            var serializedType = reflectType(type);
            var modifiers = ts.getCombinedModifierFlags(decl);
            var name_1 = getPropertyName(sym);
            // Ensure serializedType has a valid kind property
            if (!serializedType || typeof serializedType.kind === 'undefined') {
                // console.warn('serializePropertySymbol: serializedType missing kind for symbol:', (sym as any).escapedName || sym.name);
                return {
                    name: name_1,
                    modifiers: modifiers,
                    type: { kind: types_1.TypeKind.Unknown2 },
                };
            }
            var initializer = ts.isPropertyDeclaration(sym.valueDeclaration)
                ? serializeInitializer(sym.valueDeclaration)
                : undefined;
            return {
                name: name_1,
                modifiers: modifiers,
                type: __assign(__assign({}, serializedType), { initializer: initializer }),
            };
        }
        catch (error) {
            // console.warn('serializePropertySymbol failed for symbol:', (sym as any).escapedName || sym.name, (error as Error).message);
            // Return a minimal fallback property
            var symbolName = sym.escapedName || sym.name || 'unknown';
            return {
                name: ts.factory.createIdentifier(String(symbolName)),
                modifiers: 0,
                type: { kind: types_1.TypeKind.Unknown2 },
            };
        }
    }
    function serializeConstructorParameter(param) {
        var decl = param.declarations[0];
        var type = reflectType(ctx.checker.getTypeOfSymbolAtLocation(param, decl));
        var modifiers = ts.getCombinedModifierFlags(decl);
        var initializer = param.valueDeclaration && ts.isParameter(param.valueDeclaration)
            ? serializeInitializer(param.valueDeclaration)
            : undefined;
        return {
            name: param.getName(),
            modifiers: modifiers,
            type: __assign(__assign({}, type), { initializer: initializer }),
        };
    }
    function serializeConstructorSignature(sign) {
        var parameters = sign.getParameters().map(serializeConstructorParameter);
        var decl = sign.getDeclaration();
        var modifiers = decl ? ts.getCombinedModifierFlags(decl) : 0;
        return {
            parameters: parameters,
            modifiers: modifiers,
        };
    }
    function serializeObjectType(type) {
        var symbol = type.getSymbol();
        var properties = [];
        try {
            properties = ctx.checker
                .getPropertiesOfType(type)
                .map(serializePropertySymbol)
                .filter(function (prop) { return prop != null; }); // Filter out failed serializations
        }
        catch (error) {
            // console.warn('serializeObjectType: Failed to get properties for type:', symbol ? symbol.getName() : 'unknown', (error as Error).message);
        }
        var name;
        if (type.objectFlags & ts.ObjectFlags.Anonymous) {
            name = undefined;
        }
        else {
            name = symbol.getName();
        }
        if (type.getCallSignatures().length) {
            return { kind: types_1.TypeKind.Function };
        }
        return { kind: types_1.TypeKind.Object, name: name, properties: properties };
    }
    function serializeObject(type) {
        try {
            if (type.objectFlags & ts.ObjectFlags.Reference) {
                return serializeReference(type);
            }
            var symbol = type.getSymbol();
            if (symbol.flags & ts.SymbolFlags.Method) {
                return { kind: types_1.TypeKind.Function };
            }
            if (symbol.valueDeclaration !== undefined) {
                var typeName = getIdentifierForSymbol(type);
                return { kind: types_1.TypeKind.Reference, type: typeName, arguments: [] };
            }
            return serializeObjectType(type);
        }
        catch (error) {
            // console.warn('serializeObject failed:', (error as Error).message);
            return { kind: types_1.TypeKind.Unknown2 };
        }
        // } else if (type.objectFlags & ts.ObjectFlags.Anonymous) {
        //   return {
        //     kind: TypeKind.Reference,
        //     type: ts.createIdentifier("Object"),
        //     arguments: []
        //   };
        // }
        // ctx.reportUnknownType(type);
        // return { kind: TypeKind.Unknown2 };
    }
    function reflectType(type) {
        try {
            if (type.flags & ts.TypeFlags.Any) {
                return { kind: types_1.TypeKind.Any };
            }
            else if (type.flags & ts.TypeFlags.StringLiteral) {
                return {
                    kind: types_1.TypeKind.StringLiteral,
                    value: type.value
                };
            }
            else if (type.flags & ts.TypeFlags.NumberLiteral) {
                return {
                    kind: types_1.TypeKind.NumberLiteral,
                    value: type.value
                };
            }
            else if (type.flags & ts.TypeFlags.String) {
                return { kind: types_1.TypeKind.String };
            }
            else if (type.flags & ts.TypeFlags.Number) {
                return { kind: types_1.TypeKind.Number };
            }
            else if (type.flags & ts.TypeFlags.Boolean) {
                return { kind: types_1.TypeKind.Boolean };
            }
            else if (type.flags & ts.TypeFlags.BooleanLiteral) {
                switch (type.intrinsicName) {
                    case "true":
                        return { kind: types_1.TypeKind.TrueLiteral };
                    case "false":
                        return { kind: types_1.TypeKind.FalseLiteral };
                }
            }
            else if (type.flags & ts.TypeFlags.ESSymbol) {
                return { kind: types_1.TypeKind.ESSymbol };
            }
            else if (type.flags & ts.TypeFlags.Void) {
                return { kind: types_1.TypeKind.Void };
            }
            else if (type.flags & ts.TypeFlags.Undefined) {
                return { kind: types_1.TypeKind.Undefined };
            }
            else if (type.flags & ts.TypeFlags.Null) {
                return { kind: types_1.TypeKind.Null };
            }
            else if (type.flags & ts.TypeFlags.Never) {
                return { kind: types_1.TypeKind.Never };
            }
            else if (type.flags & ts.TypeFlags.Unknown) {
                return { kind: types_1.TypeKind.Unknown };
            }
            else if (type.flags & ts.TypeFlags.Object) {
                return serializeObject(type);
            }
            else if (type.flags & ts.TypeFlags.Union) {
                return serializeUnion(type);
            }
            ctx.reportUnknownType(type);
            return { kind: types_1.TypeKind.Unknown2 };
        }
        catch (error) {
            // console.warn('reflectType failed:', (error as Error).message);
            return { kind: types_1.TypeKind.Unknown2 };
        }
    }
    function reflectClass(type) {
        var base = type.getBaseTypes();
        var extendsCls;
        if (base.length > 0) {
            extendsCls = reflectType(base[0]);
        }
        var symbol = type.getSymbol();
        var name = symbol.getName();
        ctx.checker.getPropertiesOfType(type); //setting declaredProperties
        var properties = type.declaredProperties.filter(function (sym) { return sym.flags & ts.SymbolFlags.Property; }).map(serializePropertySymbol);
        var constructorType = ctx.checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration);
        var constructors = constructorType.getConstructSignatures().map(serializeConstructorSignature);
        return {
            name: name,
            properties: properties,
            constructors: constructors,
            kind: types_1.TypeKind.Class,
            extends: extendsCls
        };
    }
    return { reflectClass: reflectClass, reflectType: reflectType };
}
exports.getReflect = getReflect;
//# sourceMappingURL=reflect.js.map