import { ReflectedType } from "./publicTypes";
export declare const REFLECTIVE_KEY: '__is_ts_runtime_reflective_decorator';
export type MarkReflective<T> = T & {
    [REFLECTIVE_KEY]: boolean;
};
export declare function createReflective<T>(fn: (type: ReflectedType) => T): MarkReflective<T>;
