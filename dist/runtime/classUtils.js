"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClassType = exports.Reflective = exports.defineReflectMetadata = void 0;
require("reflect-metadata");
var common_1 = require("./common");
// type Decorator = (target: any) => void
var MetadataKey = Symbol("tsruntime:type");
function defineReflectMetadata(target, reflectedType) {
    Reflect.defineMetadata(MetadataKey, reflectedType, target);
}
exports.defineReflectMetadata = defineReflectMetadata;
exports.Reflective = (0, common_1.createReflective)(function (reflectedType) { return function (target) {
    defineReflectMetadata(target, reflectedType);
}; });
function getClassType(target) {
    return Reflect.getMetadata(MetadataKey, target);
}
exports.getClassType = getClassType;
//# sourceMappingURL=classUtils.js.map