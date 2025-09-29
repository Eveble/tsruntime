"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeLiteral = void 0;
var ts = require("typescript");
var types_1 = require("./types");
function getExpressionForPropertyName(name) {
    // if (ts.isComputedPropertyName(name)) {
    //   throw new Error('is computed property')
    // }
    if (ts.isIdentifier(name)) {
        return ts.factory.createStringLiteral(ts.idText(name));
    }
    return name;
}
function makeLiteral(type, modifier) {
    var assigns = [];
    var kindAssign = ts.factory.createPropertyAssignment("kind", ts.factory.createNumericLiteral(type.kind));
    var kindAssignComment = ts.addSyntheticTrailingComment(kindAssign, ts.SyntaxKind.MultiLineCommentTrivia, types_1.TypeKind[type.kind], false);
    assigns.push(kindAssignComment);
    if (type.initializer !== undefined) {
        assigns.push(ts.factory.createPropertyAssignment("initializer", type.initializer));
    }
    if (modifier !== undefined) {
        assigns.push(ts.factory.createPropertyAssignment("modifiers", ts.factory.createNumericLiteral(modifier)));
    }
    switch (type.kind) {
        case types_1.TypeKind.Object:
        case types_1.TypeKind.Class:
            if (type.name) {
                assigns.push(ts.factory.createPropertyAssignment("name", ts.factory.createStringLiteral(type.name)));
            }
            // assigns.push(ts.factory.createPropertyAssignment("arguments", ts.createArrayLiteral(type.arguments.map(makeLiteral))))
            assigns.push(ts.factory.createPropertyAssignment("properties", ts.factory.createObjectLiteralExpression(type.properties.map(function (_a) {
                var name = _a.name, type = _a.type, modifiers = _a.modifiers;
                return ts.factory.createPropertyAssignment(getExpressionForPropertyName(name), makeLiteral(type, modifiers));
            }))));
            if (type.kind === types_1.TypeKind.Class) {
                assigns.push(ts.factory.createPropertyAssignment("constructors", ts.factory.createArrayLiteralExpression((type).constructors.map(function (_a) {
                    var modifiers = _a.modifiers, parameters = _a.parameters;
                    return ts.factory.createObjectLiteralExpression([
                        ts.factory.createPropertyAssignment("modifiers", ts.factory.createNumericLiteral(modifiers)),
                        ts.factory.createPropertyAssignment("parameters", ts.factory.createArrayLiteralExpression(parameters.map(function (_a) {
                            var name = _a.name, modifiers = _a.modifiers, type = _a.type;
                            return ts.factory.createObjectLiteralExpression([
                                ts.factory.createPropertyAssignment("name", ts.factory.createStringLiteral(name)),
                                ts.factory.createPropertyAssignment("modifiers", ts.factory.createNumericLiteral(modifiers)),
                                ts.factory.createPropertyAssignment("type", makeLiteral(type)),
                            ]);
                        })))
                    ]);
                }))));
            }
            break;
    }
    switch (type.kind) {
        case types_1.TypeKind.Tuple:
            assigns.push(ts.factory.createPropertyAssignment("elementTypes", ts.factory.createArrayLiteralExpression(type.elementTypes.map(function (el) { return makeLiteral(el); }))));
            break;
        case types_1.TypeKind.Union:
            assigns.push(ts.factory.createPropertyAssignment("types", ts.factory.createArrayLiteralExpression(type.types.map(function (tp) { return makeLiteral(tp); }))));
            break;
        case types_1.TypeKind.StringLiteral:
            assigns.push(ts.factory.createPropertyAssignment('value', ts.factory.createStringLiteral(type.value)));
            break;
        case types_1.TypeKind.NumberLiteral:
            assigns.push(ts.factory.createPropertyAssignment('value', ts.factory.createNumericLiteral(type.value)));
            break;
        case types_1.TypeKind.Reference:
            assigns.push(ts.factory.createPropertyAssignment("type", type.type));
            assigns.push(ts.factory.createPropertyAssignment("arguments", ts.factory.createArrayLiteralExpression(type.arguments.map(function (arg) { return makeLiteral(arg); }))));
            break;
        case types_1.TypeKind.Class:
            if (type.extends !== undefined) {
                assigns.push(ts.factory.createPropertyAssignment("extends", makeLiteral(type.extends)));
            }
            break;
    }
    return ts.factory.createObjectLiteralExpression(assigns);
}
exports.makeLiteral = makeLiteral;
//# sourceMappingURL=makeLiteral.js.map