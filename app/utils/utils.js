'use strict';
// const utilsSdwk = require('@xu10000/utils-sdwk');
// const moment = require('moment');
// const { v4: uuidv4 } = require('uuid');
// const _md5 = require('md5');
// const crypto = require('crypto');
// const KEY_ALGORITHM = 'aes-128-ecb';
const os = require('os');

const getIpUrls = [
  'whatismyip.akamai.com',
  'icanhazip.com',
  'members.3322.org/dyndns/getip',
];

module.exports = {
//   md5(str) {
//     return _md5(str);
//   },
//   // 格式化时间
//   formatTime(time) {
//     return moment(time).format('YYYY-MM-DD HH:mm:ss');
//   },
  printError(app, preMessage, err) {
    if (!err) {
      app.coreLogger.error(`[egg-consul] ${preMessage} `);
      throw new Error('调用printError没有传入err');
    }
    if (err.stack) {
      app.coreLogger.error(`[egg-consul] ${preMessage} stack:${JSON.stringify(err.stack)}`);
    }
    const _err = err.message || JSON.stringify(err);
    app.coreLogger.error(`[egg-consul] ${preMessage}:${_err}`);
    return _err;
  },
  printWarn(app, preMessage, err) {
    if (!err) {
      app.coreLogger.warn(`[egg-consul] ${preMessage} `);
      throw new Error('调用printError没有传入err');
    }
    if (err.stack) {
      app.coreLogger.warn(`[egg-consul] ${preMessage} stack:${JSON.stringify(err.stack)}`);
    }
    const _err = err.message || JSON.stringify(err);
    app.coreLogger.warn(`[egg-consul] ${preMessage}:${_err}`);
    return _err;
  },
  // 返回[0,max)间的整数
  random(max) {
    return Math.floor(Math.random() * max);
  },
  //   uuid() {
  //     return uuidv4(); // ⇨ '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'
  //   },
  async sleep(time) {
    return new Promise(resolve => setTimeout(resolve, time));
  },
  async publicIp(app) {
    for (let i = 0; i < getIpUrls.length; i++) {
      try {
        const res = await app.curl(getIpUrls[i], {
          dataType: 'text',
          timeout: 5000,

        });

        const isIp = /(2(5[0-5]|[0-4]\d))|[0-1]?\d{1,2}/.test(res.data);
        if (isIp) {
          return res.data;
        }
      } catch (err) {
        this.printError(app, '获取公网ip失败', err);
      }
    }
    throw new Error('全部url获取公网ip错误，是否网络问题');
  },


  // getHeaderInfo(ctx, config, token, info) {
  //     let obj1 = utilsSdwk.decryptToken(config, token);
  //     // 兼容以前版本，没有accountId
  //     if(!obj1.accountId) {
  //         obj1.accountId = obj1.id
  //     }
  //     obj1.userId = obj1.id;
  //     const obj2 = JSON.parse(decodeURIComponent(info));
  //     obj2.country = (ctx.headers['cf-ipcountry'] ? ctx.headers['cf-ipcountry'].toLowerCase() : obj2.country) || 'us';


  //     let obj = Object.assign(obj1, obj2);
  //     obj.appType = obj.app_type || 0;
  //     // // android 包名
  //     obj.pkgName = obj.pkg_name == 'com.webcomics.manga'? 1: 2
  //     return obj;
  // },
  getEllipsisName(name) {
    let _name = name.substr(0, 20);
    if (_name.length === 20) {
      _name = _name + '...';
    }
    return _name;

  },
  // getHeaderToken(config, token) {
  //     let obj = utilsSdwk.decryptToken(config, token);
  //     // 兼容以前版本，没有accountId
  //     if(!obj.accountId) {
  //         obj.accountId = obj.id
  //     }

  //     return obj;
  // },
  getAesKey(dataStr) {
    let key = '';
    let hexKey = '';
    const dataBuffer = Buffer.from(dataStr);
    for (let i = 0; i < dataBuffer.length; i++) {
      if (i % 2 === 0) {
        hexKey += (String.fromCharCode(dataBuffer[i]));
        key += ((dataBuffer[i]).toString(16));
      }
    }
    return { key, hexKey };
  },

  //   encrypt(data, key) {
  //     const password = Buffer.from(key, 'hex').toString();
  //     const cipher = crypto.createCipheriv(KEY_ALGORITHM, password, '');
  //     const enData = [];
  //     enData.push(cipher.update(data, 'utf8', 'base64'));
  //     enData.push(cipher.final('base64'));
  //     return enData.join('');
  //   },

  //   decrypt(data, key) {
  //     const password = Buffer.from(key, 'hex').toString();
  //     const decipher = crypto.createDecipheriv(KEY_ALGORITHM, password, '');
  //     const res = [];
  //     res.push(decipher.update(data, 'base64', 'utf8'));
  //     res.push(decipher.final('utf8'));
  //     return res.join('');
  //   },

  // 将用户请求发到消息队列
  mixRequestAndResult(ctx) {
    const request = ctx.request;
    let info;
    if (!ctx.headers.info) {
      info = {};
    } else {
      try {
        info = JSON.parse(decodeURIComponent(ctx.headers.info));
      } catch (_) {
        ctx.logger.info('mixRequestAndResult 解析info出错 ctx.headers.info: ', ctx.headers.info);
      }
    }
    const serverTime = new Date().getTime();
    const logActionObj = {};
    const reqActionBody = {
      url: request.url, method: request.method, body: request.body,
    };
    const reqHeadersInfo = info;
    logActionObj.deviceId = reqHeadersInfo.udid || '';
    logActionObj.isPayUser = request.isPayUser || false;
    logActionObj.device = {
      udid: reqHeadersInfo.udid || '',
      osType: reqHeadersInfo.os_type || '',
      brand: reqHeadersInfo.brand || '',
      model: reqHeadersInfo.model || '',
      resolution: reqHeadersInfo.resolution || '',
      screenSize: reqHeadersInfo.screen_size || '',
      memoryTotal: reqHeadersInfo.memory_total || '',
      osVersion: reqHeadersInfo.os_version || '',
      simCountryCode: reqHeadersInfo.sim_country_code || '',
      imsi: reqHeadersInfo.imsi || '',
    };
    logActionObj.position = {
      appVersionCode: reqHeadersInfo.app_version_code || 0,
      appVersion: reqHeadersInfo.app_version || '',
      pkgName: reqHeadersInfo.pkg_name || '', // 包名称
      channel: reqHeadersInfo.channel || '',
      country: reqHeadersInfo.country || '',
      language: reqHeadersInfo.language || '',
      network: reqHeadersInfo.network || '',
      eip: request.ip,
    };
    // ctx.logger.info('-xxxxx eip ', request.ip)
    //   request.headers.info = encodeURIComponent(JSON.stringify(reqHeadersInfo));
    logActionObj.reqHeaders = request.headers;
    logActionObj.reqActionBody = reqActionBody;
    logActionObj.timestamp = reqHeadersInfo.timestamp;
    logActionObj.diffServerTime = serverTime - request.headers.startSerActionTime;
    logActionObj.serverTime = serverTime;
    logActionObj.actionResult = ctx.body;
    return logActionObj;
  },

  getInnerIp() {
    const ifaces = os.networkInterfaces();
    for (const dev in ifaces) {
      for (const index in ifaces[dev]) {
        if (ifaces[dev][index].family == 'IPv4') {
          const myip = ifaces[dev][index].address;
          if (myip !== '127.0.0.1') {
            console.log('-----myip-------  ', myip);
            return myip;
          }
        }
      }
    }
  },

  async promiseParallel(parallelObj) {
    const promiseAll = [];
    for (const key in parallelObj) {
      promiseAll.push(parallelObj[key]);
    }
    const results = await Promise.all(promiseAll);
    let i = 0;
    for (const key in parallelObj) {
      parallelObj[key] = results[i];
      i++;
    }
    return parallelObj;
  },
};
