// import type { StyleProp, ViewStyle } from 'react-native';

// export type OnLoadEventPayload = {
//   url: string;
// };

// export type MyRustModuleEvents = {
//   onChange: (params: ChangeEventPayload) => void;
// };

// export type ChangeEventPayload = {
//   value: string;
// };

// export type MyRustModuleViewProps = {
//   url: string;
//   onLoad: (event: { nativeEvent: OnLoadEventPayload }) => void;
//   style?: StyleProp<ViewStyle>;
// };



import type { StyleProp, ViewStyle } from 'react-native';

export type OnLoadEventPayload = {
  url: string;
};

export type ChangeEventPayload = {
  value: string;
  timestamp: number;
};

export type CalculationEventPayload = {
  operation: string;
  operands: { a: number; b: number };
  result: Record<string, any>;
  timestamp: number;
};

export type ErrorEventPayload = {
  error: string;
  details?: string;
};

export type BatchCompleteEventPayload = {
  totalOperations: number;
  successCount: number;
  hasErrors: boolean;
  results: Array<Record<string, any>>;
};

export type MyRustModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
  onCalculation: (params: CalculationEventPayload) => void;
  onError: (params: ErrorEventPayload) => void;
  onBatchComplete: (params: BatchCompleteEventPayload) => void;
};

export type MyRustModuleViewProps = {
  url: string;
  onLoad: (event: { nativeEvent: OnLoadEventPayload }) => void;
  style?: StyleProp<ViewStyle>;
};




export interface CalculationResult {
  operation: string;
  operands: {
    left: number;
    right: number;
  };
  result: number;
  success: boolean;
  timestamp: string;
  error?: string;
}

export interface BatchOperation {
  a: number;
  b: number;
  operation: 'add' | 'sub' | 'mul' | 'div';
}

export interface BatchResult extends CalculationResult {
  batchIndex: number;
}

export interface ModuleInfo {
  name: string;
  version: string;
  supportedOperations: string[];
  capabilities: string[];
  limits: {
    maxInt: number;
    minInt: number;
  };
}

export interface PerformanceTestResult {
  iterations: number;
  totalTime: number;
  wallClockTime: number;
  averageTime: number;
  operationsPerSecond: number;
}

export interface ExpressionResult extends CalculationResult {
  originalExpression: string;
}


export interface ErrorEvent {
  error: string;
  details?: string;
}


export interface BatchCompleteEvent {
  totalOperations: number;
  successCount: number;
  hasErrors: boolean;
  results: BatchResult[];
}