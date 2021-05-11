'use strict';

const Subscription = require('egg').Subscription;
const consulHelper = require('../../index');
const utils = require('../utils/utils');
// const x = null;
const redis = require('../utils/redis.js');
class PassServices extends Subscription {
  // 通过 schedule 属性来设置定时任务的执行间隔等配置
  static get schedule() {
    return {
      interval: '5s', // 1 分钟间隔
      type: 'worker', // 指定所有的 worker 都需要执行
      // immediate: true,
    };
  }

  // subscribe 是真正定时任务执行时被运行的函数
  async subscribe() {
    const app = this.app;
    try {
      const key = `apiConsulMulti${app.config.name}${app.config.env}`;
      const res = await redis.use(this.app, 'serviceHostCache', 'set', [ key, 1, 'ex', 3, 'nx' ]);

      if (!res.result) {
        return;
      }

      // ctx.logger.debug(`consulHelper addr ${x == consulHelper}`);
      // x = consulHelper;
      await consulHelper.setPassingServices(app);
    } catch (err) {
      utils.printError(app, 'consul.health.service err', err);
    }
  }
}

module.exports = PassServices;

