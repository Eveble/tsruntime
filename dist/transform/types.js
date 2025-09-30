"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ctx = exports.TypeKind = void 0;
var publicTypes_1 = require("../runtime/publicTypes");
Object.defineProperty(exports, "TypeKind", { enumerable: true, get: function () { return publicTypes_1.TypeKind; } });
var Ctx = /** @class */ (function () {
    function Ctx(checker, node, currentScope, markReferenced) {
        var _this = this;
        this.checker = checker;
        this.node = node;
        this.currentScope = currentScope;
        this.markReferenced = markReferenced;
        this.reportUnknownType = function (type) {
            var checker = _this.checker;
            var msg = "unknown type, ".concat(checker.typeToString(type));
            _this.reportWarning(msg);
        };
        this.reportWarning = function (msg) {
            var node = _this.node;
            var fname = node.getSourceFile().fileName;
            var location = node
                .getSourceFile()
                .getLineAndCharacterOfPosition(node.getStart());
            var node_text = node.getText();
            console.warn("\n\ntsruntime: ".concat(msg, ": ").concat(fname, " ").concat(location.line, ":").concat(location.character, ": ").concat(node_text, "\n"));
        };
    }
    return Ctx;
}());
exports.Ctx = Ctx;
//# sourceMappingURL=types.js.map