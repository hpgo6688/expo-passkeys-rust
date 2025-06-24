import { NativeModule, registerWebModule } from 'expo';

import { ChangeEventPayload } from './MyRustModule.types';

type MyRustModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class MyRustModule extends NativeModule<MyRustModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(MyRustModule, 'MyRustModule');
