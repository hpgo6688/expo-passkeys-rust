import { requireNativeView } from 'expo';
import * as React from 'react';

import { MyRustModuleViewProps } from './MyRustModule.types';

const NativeView: React.ComponentType<MyRustModuleViewProps> =
  requireNativeView('MyRustModule');

export default function MyRustModuleView(props: MyRustModuleViewProps) {
  return <NativeView {...props} />;
}
