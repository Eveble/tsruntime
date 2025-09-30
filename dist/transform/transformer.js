"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var common_1 = require("../runtime/common");
var makeLiteral_1 = require("./makeLiteral");
var reflect_1 = require("./reflect");
var types_1 = require("./types");
function getSymbolId(symb) {
    return symb.id;
}
function shouldReflect(checker, node) {
    var type = checker.getTypeAtLocation(node.expression);
    return Boolean(getPropertyInMaybeUnion(checker, type, common_1.REFLECTIVE_KEY));
}
function getPropertyInMaybeUnion(checker, type, propertyName) {
    var typesToCheck;
    if (type.flags & ts.TypeFlags.UnionOrIntersection) {
        typesToCheck = type.types;
    }
    else {
        typesToCheck = [type];
    }
    return typesToCheck.find(function (type) {
        return Boolean(checker.getPropertyOfType(type, propertyName));
    });
}
function patchEmitResolver(checker, context) {
    var ReferencedSet = new Set();
    var markReferenced = function (symb) {
        return ReferencedSet.add(getSymbolId(symb));
    };
    ////hack (99
    var emitResolver = context.getEmitResolver();
    var oldIsReferenced = emitResolver.isReferencedAliasDeclaration;
    emitResolver.isReferencedAliasDeclaration = function (node, checkChildren) {
        var res = oldIsReferenced(node, checkChildren);
        if (res === true) {
            return true;
        }
        if (node.kind === ts.SyntaxKind.ImportSpecifier) {
            var name_1 = node.name;
            var origSymb = checker.getAliasedSymbol(checker.getSymbolAtLocation(name_1));
            // const symb = checker.getSymbolAtLocation(name)
            return ReferencedSet.has(getSymbolId(origSymb));
        }
        return true;
    };
    var onNewSourceFile = function () {
        ReferencedSet.clear();
    };
    return { markReferenced: markReferenced, onNewSourceFile: onNewSourceFile };
}
function Transformer(program, context) {
    var currentScope;
    var checker = program.getTypeChecker();
    var _a = patchEmitResolver(checker, context), markReferenced = _a.markReferenced, onNewSourceFile = _a.onNewSourceFile;
    var createContext = function (node) {
        return new types_1.Ctx(checker, node, currentScope, markReferenced);
    };
    function visitCallExperssion(node) {
        var visitNodeChildren = function () { return ts.visitEachChild(node, visitor, context); };
        if (!shouldReflect(checker, node)) {
            return visitNodeChildren();
        }
        var ctx = createContext(node);
        var fnTypeNode = (node.typeArguments || [])[0];
        if (!fnTypeNode) {
            ctx.reportWarning('is reflective but don\'t have generic type argument, see docs');
            return visitNodeChildren();
        }
        var type = checker.getTypeAtLocation(fnTypeNode);
        var reflectedType = (0, reflect_1.getReflect)(ctx).reflectType(type);
        var literal = (0, makeLiteral_1.makeLiteral)(reflectedType);
        var newExpression = ts.factory.createCallExpression(node.expression, undefined, [literal]);
        return ts.factory.updateCallExpression(node, newExpression, node.typeArguments, ts.visitNodes(node.arguments, visitor));
    }
    function visitDecotaror(node) {
        if (!shouldReflect(checker, node)) {
            return node;
        }
        var ctx = createContext(node);
        var classDeclaration = node.parent;
        var type = checker.getTypeAtLocation(classDeclaration);
        if (classDeclaration.kind !== ts.SyntaxKind.ClassDeclaration) {
            ctx.reportWarning('cant find decorator\'s class declaration');
            return node;
        }
        var reflectedType = (0, reflect_1.getReflect)(ctx).reflectClass(type);
        var literal = (0, makeLiteral_1.makeLiteral)(reflectedType);
        var newExpression = ts.factory.createCallExpression(node.expression, undefined, [literal]);
        return ts.factory.updateDecorator(node, newExpression);
    }
    function onBeforeVisitNode(node) {
        switch (node.kind) {
            case ts.SyntaxKind.SourceFile:
            case ts.SyntaxKind.ModuleBlock:
                currentScope = node;
                break;
        }
    }
    function visitor(node) {
        onBeforeVisitNode(node);
        switch (node.kind) {
            case ts.SyntaxKind.Decorator:
                return visitDecotaror(node);
            case ts.SyntaxKind.CallExpression:
                return visitCallExperssion(node);
            default:
                return ts.visitEachChild(node, visitor, context);
        }
    }
    function transform(sourceI) {
        onNewSourceFile();
        var source = sourceI;
        if (source.isDeclarationFile) {
            return source;
        }
        onBeforeVisitNode(source);
        var newNode = ts.visitEachChild(source, visitor, context);
        newNode.symbol = source.symbol;
        return newNode;
    }
    return transform;
}
function TransformerFactory(program) {
    return function (ctx) { return Transformer(program, ctx); };
}
exports.default = TransformerFactory;
//# sourceMappingURL=transformer.js.map