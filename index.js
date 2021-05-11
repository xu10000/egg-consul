'use strict';
const _consul = require('consul');
const redis = require('./app/utils/redis.js');
const utils = require('./app/utils/utils.js');
const healthTimeout = '2s';
const registerTimeout = '5s';
const MAXERROR = 10;
class Consul {

  async updateErrorHost(app, consul, serviceName, errorHosts) {
    const res = await redis.use(app, 'serviceHostCache', 'hmget', [ `serviceNameError${app.config.env}`, serviceName, `${serviceName}Times` ]);
    // 错误打到上限删除
    if (parseInt(res.result[1]) === MAXERROR) {
      await redis.use(app, 'serviceHostCache', 'hmset', [ `serviceNameError${app.config.env}`, serviceName, '', `${serviceName}Times`, 0 ]);
      const ips = res.result[0].split(',');
      for (let i = 0; i < ips.length; i++) {
        try {
          await consul.agent.service.deregister({
            id: `${ips[i]}`,
          });
        } catch (err) {
          app.coreLogger.warn('[egg-consul] 删除consul服务失败serviceName ', ips[i]);
        }
      }
      return;
    }
    // 无内容  或者  不一样错误，清空次数，设置新次数
    if (!res.result[0] || (res.result[0] !== errorHosts)) {
      await redis.use(app, 'serviceHostCache', 'hmset', [ `serviceNameError${app.config.env}`, serviceName, errorHosts, `${serviceName}Times`, 1 ]);
      return;
    }
    // 同样错误,次数加1
    if (res.result[0] === errorHosts) {
      await redis.use(app, 'serviceHostCache', 'hmset', [ `serviceNameError${app.config.env}`, `${serviceName}Times`, parseInt(res.result[1]) + 1 ]);
    }

    //

  }
  async setPassingServices(app, isInit) {
    const config = app.config;
    const hosts = config.consul.client.hosts;

    for (let i = 0; i < hosts.length; i++) {
      // client 依次调用，成功一个就返回
      try {
        config.consul.client.host = hosts[i];
        const consul = _consul(config.consul.client);
        for (const serviceName of config.consul.services) {

          const passingHosts = [],
            criticalHosts = [];
          const result = await consul.health.service({
            service: serviceName,
            timeout: healthTimeout,
          });

          for (const _result of result) {
            app.coreLogger.info(`[egg-consul] get service success: ${serviceName}`);
            const host = `${_result.Service.Address}:${_result.Service.Port}`;
            if (_result.Checks[1].Status === 'passing') {
              // 相同host不再加入数组
              if (passingHosts.includes(host)) {
                continue;
              }
              passingHosts.push(host);

            } else {
              // 相同host不再加入数组
              if (criticalHosts.includes(host)) {
                continue;
              }
              criticalHosts.push(host);
            }

          }

          const _passingHosts = passingHosts.join(',');
          const _criticalHosts = criticalHosts.join(',');
          if (criticalHosts.length && !isInit) {
            await this.updateErrorHost(app, consul, serviceName, _criticalHosts);
          }

          const { error } = await redis.use(app, 'serviceHostCache', 'set', [ serviceName + app.config.env, _passingHosts ]);
          if (error) {
            throw error;
          }
        }
        return;
      } catch (err) {
        utils.printError(app, 'consul setPassingServices 出错', err);
      }
    }
    throw new Error('consul setPassingServices 全部调用失败');
  }
  async register(app) {
    const { config } = app;
    const { check } = config.consul.registerInfo;
    let name = config.name;
    const hosts = config.consul.client.hosts;

    for (let i = 0; i < hosts.length; i++) {
      try {
        config.consul.client.host = hosts[i];
        const consul = _consul(config.consul.client);
        let ip,
          host;
        // 在本地注册的做特殊处理
        if (config.env === 'local') {
          host = '172.31.16.180:8806';
          name = name + 'Local';
        } else {
          ip = utils.getInnerIp();
          app.coreLogger.info(`[egg-consul] -----myIp--------: ${ip}`);
          host = `${ip}:${config.cluster.listen.port}`;
        }
        if (config.consul.registerInfo.healthHttp) {
          check.http = config.consul.registerInfo.healthHttp;
        } else {
          check.http = `http://${host}`;
        }

        await consul.agent.service.register({
          id: `${host}`,
          name,
          address: ip, // 当前模块的注册地址
          check,
          port: config.cluster.listen.port, // 当前模块的注册端口号
          timeout: registerTimeout,
        });

        return name;
      } catch (err) {
        utils.printError(app, 'consul register 出错', err);
      }
      // console.log('xxxxxxxxxxxxxxxxx---------------- ', hosts[i]);
    }

    throw new Error('consul register 全部调用失败');
  }
  async init(app) {
    const name = await this.register(app);
    app.coreLogger.debug(`[egg-consul] 注册当前服务成功: ${name}`);

    await this.setPassingServices(app, true);
    app.coreLogger.debug('[egg-consul] 获取远程服务成功');


  }

  async getRemoteServiceByName(app, name) {
    try {
      let env = app.config.env;
      // 本地环境特殊处理
      if (env === 'local') {
        env = 'test';
      }
      const { error, result } = await redis.use(app, 'serviceHostCache', 'get', [ name + env ]);
      if (error) {
        return {
          error,
        };
      }
      if (!result) {
        throw new Error(`找不到${name}对应的服务`);
      }

      //   utils.printError(app, `xxxxxxxxxxx  ${name + env}  `, result);
      const hosts = result.split(',');
      const random = utils.random(hosts.length);
      return {
        host: hosts[random],
        error: null,
      };

    } catch (err) {
      const myErr = utils.printError(app, 'getServiceByName错误', err);
      return {
        error: myErr,
      };
    }
  }

}

module.exports = new Consul();
