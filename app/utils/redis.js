'use strict';
// const RedisAbsctract = require('./redisAbstract');
/**
 * 继承自RedisAbsctract, 需实现里面的方法
 */
class Redis {
  constructor() {
    this.codisNeedSupport = [
      'keys', 'move', 'object', 'rename', 'renamenx', 'sort', 'scan', 'bitop', 'msetnx', 'blpop', 'brpop', 'brpoplpush', 'psubscribe，publish', 'punsubscribe', 'subscribe', 'unsubscribe', 'discard', 'exec', 'multi', 'unwatch', 'watch', 'script exists', 'script flush', 'script kill', 'script load', 'auth', 'echo', 'select', 'bgrewriteaof', 'bgsave', 'client kill', 'client list', 'config get', 'config set', 'config resetstat', 'dbsize', 'debug object', 'debug segfault', 'flushall', 'flushdb', 'info', 'lastsave', 'monitor', 'save', 'shutdown', 'slaveof', 'slowlog', 'sync', 'time',
    ];
  }
  codisAndMethod(clientName, method) {
    // console.log(clientName, ' xxxx     ', method);

    const isCodis = clientName.indexOf('codis') !== -1;
    const isTodo = this.codisNeedSupport.includes(method);
    // console.log(isCodis, ' xxxx     ', isTodo);

    // 即是codis，又调用它不支持的方法
    if (isCodis === true && isTodo === true) {
      return false;
    }

    return true;
  }

  async use(app, clientName, method, params) {
    // const tmp = arguments.callee.toString();
    // const re = /function\s*(\w*)/i;
    // const method = re.exec(tmp)[1];

    try {

      if (!params.length) {
        return {
          error: `传入params.length: ${params}`,
          value: null,
        };
      }

      const isSupport = this.codisAndMethod(clientName, method);
      if (isSupport === false) {
        return {
          error: `codis 不支持该方法 ${method}`,
          value: null,
        };
      }

      const redis = await app.redis.get(clientName);

      if (redis === undefined) {

        return {
          error: `获取app中的redis client失败： clientName ${clientName}`,
          value: null,
        };
      }

      const result = await redis[method](...params);

      if (result === 'ok') {
        return {
          error: null,
          result,
        };
      }


      if (result == null) {
        app.coreLogger.debug(`[egg-redis] in[egg-consul] empty result of key: ${params[0]}`);
      }

      return {
        error: null,
        result,
      };

    } catch (err) {
      app.coreLogger.error(`[egg-redis] in[egg-consul]  redis ${method} 异常  clientName: ${clientName} key: ${params[0]} params: ${JSON.stringify(params)}  error: ${err}`);
      return {
        error: err,
        result: null,
      };
    }
  }

}
module.exports = new Redis();

