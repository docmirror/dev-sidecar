import mainConfig from '../../../config.js';

export default {
  name: '梯子',
  enabled: false, // 默认关闭梯子
  ...mainConfig.server.plugin.overwall,
};
