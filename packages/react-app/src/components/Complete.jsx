import { AutoComplete } from 'antd';
const TOKEN_LIST = 'https://gateway.ipfs.io/ipns/tokens.uniswap.org'

const options = [
  { value: 'Burns Bay Road',
    prop: 2 },
  { value: 'butt sex',
    prop: 6 },
  { value: 'Wall Breet',
    prop: 1 },
];

const Complete: React.FC = () => (
  <AutoComplete
    style={{ width: 200 }}
    options={options}
    placeholder="try to type `b`"
    filterOption={true}
  />
);

export default () => <Complete />;
