'use strict';

const sdwkConsul = require('./index');

module.exports = async app => {
  if (!app.config.consul || !app.config.redis.clients.serviceHostCache) {
    app.coreLogger.error('请配置app.config.consul和app.config.redis.clients.serviceHostCache');
    return;
  }
  await sdwkConsul.init(app);
};
