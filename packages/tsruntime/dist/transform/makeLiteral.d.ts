import * as ts from 'typescript';
import { ReflectedType } from './types';
export declare function makeLiteral(type: ReflectedType, modifier?: ts.ModifierFlags): ts.ObjectLiteralExpression;
