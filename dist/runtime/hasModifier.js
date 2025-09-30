"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasModifier = void 0;
var hasModifier = function (type, modifier) {
    if (modifier === type.modifiers) {
        return true;
    }
    return !!(type.modifiers & modifier);
};
exports.hasModifier = hasModifier;
//# sourceMappingURL=hasModifier.js.map