import * as React from 'react';

import { MyRustModuleViewProps } from './MyRustModule.types';

export default function MyRustModuleView(props: MyRustModuleViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
