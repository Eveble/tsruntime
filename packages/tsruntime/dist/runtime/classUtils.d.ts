import 'reflect-metadata';
import { ClassType, ReflectedType } from './publicTypes';
import { MarkReflective } from './common';
export declare function defineReflectMetadata(target: any, reflectedType: ReflectedType): void;
export declare const Reflective: MarkReflective<(target: any) => void>;
export declare function getClassType(target: Function): ClassType;
