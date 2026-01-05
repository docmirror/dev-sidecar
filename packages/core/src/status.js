import lodash from 'lodash';
import event from './event.js';
import log from './utils/util.log.core.js';

const status = {
  server: { enabled: false },
  proxy: {},
  plugin: {},
}

event.register('status', (event) => {
  lodash.set(status, event.key, event.value)
  log.info('status changed:', event)
}, -999)

export default status;
