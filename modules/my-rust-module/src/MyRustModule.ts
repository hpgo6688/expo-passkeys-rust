import { NativeModule, requireNativeModule } from 'expo';
import { BatchOperation, BatchResult, CalculationResult, ExpressionResult, MyRustModuleEvents, PerformanceTestResult, User } from './MyRustModule.types';

declare class MyRustModule extends NativeModule<MyRustModuleEvents> {
  PI: number;
  VERSION: string;
  MAX_INT: number;
  SUPPORTED_OPERATIONS: string[];

  hello(): string;
  syncAdd(a: number, b: number): number;
  isOperationSupported(operation: string): boolean;
  getModuleInfo(): Record<string, any>;
  formatNumber(number: number, decimals: number): string;

  createUser(id: number, name: string): User;
  autoMemoryCreateUser(id: number, name: string): User;

  // Async functions
  rustAdd(a: number, b: number): Promise<number>;
  rustAddString(a: number, b: number): Promise<string>;
  rustAddJson(a: number, b: number): Promise<CalculationResult>;
  rustCalculate(a: number, b: number, operation: string): Promise<CalculationResult>;
  rustBatchCalculate(operations: BatchOperation[]): Promise<BatchResult[]>;
  evaluateExpression(expression: string): Promise<ExpressionResult>;
  setValueAsync(value: string): Promise<{ success: boolean; value: string }>;
  performanceTest(iterations: number): Promise<PerformanceTestResult>;

  // Add the performGetRequest function
  performGetRequest(): Promise<string>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<MyRustModule>('MyRustModule');
