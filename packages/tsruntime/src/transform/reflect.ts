import * as ts from "typescript";
import {ClassType, Constructor, ConstructorParameter, Ctx, ReflectedType, TypeKind} from "./types";

namespace Normalizers {
  function normalizeBooleans(types: ReflectedType[]): ReflectedType[] {
    let hasFalse = false;
    let hasTrue = false;
    let hasBoolean = false;

    for (const type of types) {
      switch (type.kind) {
        case TypeKind.FalseLiteral:
          hasFalse = true;
          break;
        case TypeKind.TrueLiteral:
          hasTrue = true;
          break;
        case TypeKind.Boolean:
          hasBoolean = true;
          break;
      }
    }

    if (hasBoolean || (hasTrue && hasFalse)) {
      return [{ kind: TypeKind.Boolean }];
    }
    return types;
  }

  export function normalizeUnion(types: ReflectedType[]) {
    const booleans: ReflectedType[] = [];
    const okTypes: ReflectedType[] = [];

    types.forEach(type => {
      switch (type.kind) {
        case TypeKind.FalseLiteral:
        case TypeKind.TrueLiteral:
        case TypeKind.Boolean:
          booleans.push(type);
          break;
        default:
          okTypes.push(type);
          break;
      }
    });

    const normalizedTypes: ReflectedType[] = [];

    if (booleans.length > 0) {
      normalizedTypes.push(...normalizeBooleans(booleans));
    }

    return okTypes.concat(normalizedTypes);
  }
}

export function getReflect(ctx: Ctx) {
  function serializeUnion(type: ts.UnionType): ReflectedType {
    const nestedTypes = type.types.map(t => reflectType(t));
    const normalizedTypes = Normalizers.normalizeUnion(nestedTypes);
    return { kind: TypeKind.Union, types: normalizedTypes };
  }

  function serializeReference(type: ts.TypeReference): ReflectedType {
    try {
      const typeArgs = type.typeArguments;
      let allTypes: ReflectedType[] = [];
      if (typeArgs !== undefined) {
        allTypes = typeArgs.map(t => {
          const reflectedType = reflectType(t);
          return reflectedType || { kind: TypeKind.Unknown2 };
        });
      }
      const target = type.target;
      if (target.objectFlags & ts.ObjectFlags.Tuple) {
        return { kind: TypeKind.Tuple, elementTypes: allTypes };
      }
      const symbol = target.getSymbol()!;
      if (symbol.valueDeclaration === undefined) {
        return {
          kind: TypeKind.Object,
          name: symbol.getName(),
          // arguments: allTypes,
          properties: []
        };
      } else {
        const typeName = getIdentifierForSymbol(target);
        return { kind: TypeKind.Reference, arguments: allTypes, type: typeName };
      }
    } catch (error) {
      // console.warn('serializeReference failed:', (error as Error).message);
      return { kind: TypeKind.Unknown2 };
    }
  }

  function getIdentifierForSymbol(type: ts.Type): ts.Identifier {
    let name: string;

    const typenode = ctx.checker.typeToTypeNode(type, ctx.node, undefined)!; //todo not sure

    switch (typenode.kind) {
      case ts.SyntaxKind.TypeReference:
        const typename = (<ts.TypeReferenceNode>typenode).typeName;
        name = (<ts.Identifier>typename).text;
        let origSymb = type.getSymbol()!;
        if (origSymb.getFlags() & ts.SymbolFlags.Alias) {
          origSymb = ctx.checker.getAliasedSymbol(origSymb);
        }
        if (ctx.markReferenced) {
          ctx.markReferenced(origSymb);
        }
        break;
      default:
        name = type.getSymbol()!.getName();
    }
    const typeIdentifier = ts.factory.createIdentifier(name);
    (typeIdentifier as any).flags &= ~ts.NodeFlags.Synthesized;
    (typeIdentifier as any).parent = ctx.currentScope;
    return typeIdentifier;
  }

  function getPropertyName(symbol: ts.Symbol): ts.PropertyName {
    const { valueDeclaration } = symbol;
    if (valueDeclaration) {
      // if (!ts.isPropertySignature(valueDeclaration) && !ts.isPropertyDeclaration(valueDeclaration)) {
      // throw new Error("not prop signature");
      // }
      return (valueDeclaration as ts.PropertyDeclaration).name;
    }
    //@ts-ignore
    const nameType = symbol.nameType as ts.Type;

    // PATCH: Handle undefined nameType gracefully
    if (!nameType) {
      // console.warn('getPropertyName: nameType is undefined for symbol:', (symbol as any).escapedName || symbol.name || 'unknown');
      // Fallback: create identifier from symbol name
      const symbolName = (symbol as any).escapedName || symbol.name || 'unknown';
      return ts.factory.createIdentifier(String(symbolName));
    }

    try {
      const nameSymb = nameType.getSymbol();
      if (nameSymb) {
        return nameSymb.valueDeclaration as any;
      } else {
        //@ts-expect-error
        return ts.factory.createLiteral(nameType.value);
      }
    } catch (error) {
      // console.warn('getPropertyName: getSymbol() failed:', (error as Error).message);
      const symbolName = (symbol as any).escapedName || symbol.name || 'unknown';
      return ts.factory.createIdentifier(String(symbolName));
    }
  }

  function serializeInitializer(decl: {initializer?: ts.Expression}): ts.ArrowFunction | undefined {
    return decl.initializer
      ? ts.factory.createArrowFunction(undefined, undefined, [], undefined, undefined, decl.initializer)
      : undefined;
  }

  function serializePropertySymbol(sym: ts.Symbol) {
    try {
      const decl = sym.declarations![0];
      const type = ctx.checker.getTypeOfSymbolAtLocation(sym, ctx.node);
      const serializedType = reflectType(type);
      const modifiers = ts.getCombinedModifierFlags(decl);

      const name = getPropertyName(sym);

      // Ensure serializedType has a valid kind property
      if (!serializedType || typeof (serializedType as any).kind === 'undefined') {
        // console.warn('serializePropertySymbol: serializedType missing kind for symbol:', (sym as any).escapedName || sym.name);
        return {
          name: name,
          modifiers,
          type: { kind: TypeKind.Unknown2 },
        };
      }

      const initializer = ts.isPropertyDeclaration(sym.valueDeclaration!)
        ? serializeInitializer(sym.valueDeclaration)
        : undefined;

      return {
        name: name,
        modifiers,
        type: {...serializedType, initializer},
      };
    } catch (error) {
      // console.warn('serializePropertySymbol failed for symbol:', (sym as any).escapedName || sym.name, (error as Error).message);
      // Return a minimal fallback property
      const symbolName = (sym as any).escapedName || sym.name || 'unknown';
      return {
        name: ts.factory.createIdentifier(String(symbolName)),
        modifiers: 0,
        type: { kind: TypeKind.Unknown2 },
      };
    }
  }

  function serializeConstructorParameter(param: ts.Symbol): ConstructorParameter {
    const decl = param.declarations![0];
    const type = reflectType(ctx.checker.getTypeOfSymbolAtLocation(param, decl));
    const modifiers = ts.getCombinedModifierFlags(decl);

    const initializer = param.valueDeclaration && ts.isParameter(param.valueDeclaration)
      ? serializeInitializer(param.valueDeclaration)
      : undefined;

    return {
      name: param.getName(),
      modifiers,
      type: {...type, initializer},
    };
  }

  function serializeConstructorSignature(sign: ts.Signature): Constructor {
    const parameters = sign.getParameters().map(serializeConstructorParameter);
    const decl = sign.getDeclaration()
    const modifiers = decl ? ts.getCombinedModifierFlags(decl) : 0;

    return {
      parameters,
      modifiers,
    }
  }

  function serializeObjectType(type: ts.ObjectType): ReflectedType {
    const symbol = type.getSymbol()!;
    let properties: any[] = [];

    try {
      properties = ctx.checker
        .getPropertiesOfType(type)
        .map(serializePropertySymbol)
        .filter(prop => prop != null); // Filter out failed serializations
    } catch (error) {
      // console.warn('serializeObjectType: Failed to get properties for type:', symbol ? symbol.getName() : 'unknown', (error as Error).message);
    }

    let name;
    if (type.objectFlags & ts.ObjectFlags.Anonymous) {
      name = undefined;
    } else {
      name = symbol.getName();
    }
    if (type.getCallSignatures().length) {
      return {kind: TypeKind.Function }
    }
    return { kind: TypeKind.Object, name: name, properties };
  }

  function serializeObject(type: ts.ObjectType): ReflectedType {
    try {
      if (type.objectFlags & ts.ObjectFlags.Reference) {
        return serializeReference(<ts.TypeReference>type);
      }
      const symbol = type.getSymbol()!;

      if (symbol.flags & ts.SymbolFlags.Method) {
        return {kind: TypeKind.Function }
      }

      if (symbol.valueDeclaration !== undefined) {
        const typeName = getIdentifierForSymbol(type);
        return { kind: TypeKind.Reference, type: typeName, arguments: [] };
      }
      return serializeObjectType(type);
    } catch (error) {
      // console.warn('serializeObject failed:', (error as Error).message);
      return { kind: TypeKind.Unknown2 };
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

  function reflectType(type: ts.Type): ReflectedType {
    try {
      if (type.flags & ts.TypeFlags.Any) {
        return { kind: TypeKind.Any };
      } else if (type.flags & ts.TypeFlags.StringLiteral) {
        return {
          kind: TypeKind.StringLiteral,
          value: (type as ts.StringLiteralType).value
        };
      } else if (type.flags & ts.TypeFlags.NumberLiteral) {
        return {
          kind: TypeKind.NumberLiteral,
          value: (type as ts.NumberLiteralType).value
        };
      } else if (type.flags & ts.TypeFlags.String) {
        return { kind: TypeKind.String };
      } else if (type.flags & ts.TypeFlags.Number) {
        return { kind: TypeKind.Number };
      } else if (type.flags & ts.TypeFlags.Boolean) {
        return { kind: TypeKind.Boolean };
      } else if (type.flags & ts.TypeFlags.BooleanLiteral) {
        switch ((type as any).intrinsicName) {
          case "true":
            return { kind: TypeKind.TrueLiteral };
          case "false":
            return { kind: TypeKind.FalseLiteral };
        }
      } else if (type.flags & ts.TypeFlags.ESSymbol) {
        return { kind: TypeKind.ESSymbol };
      } else if (type.flags & ts.TypeFlags.Void) {
        return { kind: TypeKind.Void };
      } else if (type.flags & ts.TypeFlags.Undefined) {
        return { kind: TypeKind.Undefined };
      } else if (type.flags & ts.TypeFlags.Null) {
        return { kind: TypeKind.Null };
      } else if (type.flags & ts.TypeFlags.Never) {
        return { kind: TypeKind.Never };
      } else if (type.flags & ts.TypeFlags.Unknown) {
        return { kind: TypeKind.Unknown };
      } else if (type.flags & ts.TypeFlags.Object) {
        return serializeObject(<ts.ObjectType>type);
      } else if (type.flags & ts.TypeFlags.Union) {
        return serializeUnion(<ts.UnionType>type);
      }

      ctx.reportUnknownType(type);
      return { kind: TypeKind.Unknown2 };
    } catch (error) {
      // console.warn('reflectType failed:', (error as Error).message);
      return { kind: TypeKind.Unknown2 };
    }
  }

  function reflectClass(
    type: ts.InterfaceTypeWithDeclaredMembers,
  ): ClassType {
    const base = type.getBaseTypes()!;
    let extendsCls: ReflectedType | undefined;
    if (base.length > 0) {
      extendsCls = reflectType(base[0]);
    }
    const symbol = type.getSymbol()!;
    const name = symbol.getName();
    ctx.checker.getPropertiesOfType(type) //setting declaredProperties
    const properties: any = type.declaredProperties.filter(sym => sym.flags & ts.SymbolFlags.Property).map(serializePropertySymbol)

    const constructorType = ctx.checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!);
    const constructors = constructorType.getConstructSignatures().map(serializeConstructorSignature);

    return {
      name: name!,
      properties,
      constructors,
      kind: TypeKind.Class,
      extends: extendsCls
    };
  }
  return {reflectClass, reflectType}
}