import * as React from 'react';
import { Select } from '@base-ui/react/select';
export default function Test() {
  return (
    <Select onValueChange={(...args) => console.log('ARGS:', args)}>
      <Select.Trigger/>
      <Select.Popup>
        <Select.Item value='1'/>
      </Select.Popup>
    </Select>
  );
}
