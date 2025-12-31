import jsonApi from '@docmirror/mitmproxy/src/json.js';
import Shell from '../shell.js';

const execute = Shell.execute

const executor = {
  async windows (exec) {
    const ret = await exec(['npm config list --json'], { type: 'cmd' })
    if (ret != null) {
      const json = ret.substring(ret.indexOf('{'))
      return jsonApi.parse(json)
    }
    return {}
  },
  async linux (exec, { port }) {
    throw new Error('暂未实现此功能')
  },
  async mac (exec, { port }) {
    throw new Error('暂未实现此功能')
  },
}

export default async function (args) {
  return execute(executor, args)
};
