### 1. 配合网关后台使用

​      a. 之后后台管理会有一个网关功能，搜索相关服务，点击禁止按钮，网关就不会将流量转发到某一台的某一个服务。



### 2. consul 和 redis配置列表

​	a. 本地环境: 

​			consul:  x.x.x.x:8500   // 测试环境对应的公网地址，因为是公网地址，这里不方便展示。

​			redis:  x.x.x.x:6379  db: 16 	// 测试环境对应的公网地址，因为是公网地址，这里不方便展示。		 

​	b. 测试环境: 

​			consul:  172.31.23.65:8500

​			redis:  172.31.29.75:6379  db: 16 

​	c. 生产环境: 

​			consul:  172.31.26.109:8500  // 需要注意，生产和正式的consul是不一样的，不要填错了

​			redis:  172.31.0.116:19000  db: 3 

​	d. 正式环境: 

​			consul:  172.31.27.91:8500

​			redis:  172.31.0.116:19000  db: 3 





### 3.项目所在的服务器和端口，要对consul开放

​    a. 比如我服务部署在测试服, 内网ip   172.31.16.180，端口8804，则需要对测试服的consul开放。即 172.31.16.180:8804 对172.31.23.65开放。（consul的ip列表在上面，本地环境则忽略，不需要此配置）

​	b. 项目安装插件 npm install egg-consul --save





### 4. 特殊的本地环境

​	a. 因为consul注册发现是根据内网ip，本地环境无法参数到内网ip中，所以插件在发现是本地运行时，注册的ip和端口是测试环境中网关的服务，否则将报错，程序无法执行。





### 5. 配置

```
// 完成配置后，程序启动会自动注册服务，并且有定时任务，定时去检查服务的健康状态。
config.consul = {
        client: {
            hosts: [
                'x.x.x.x', // consul的内网ip,具体列表在上面
            ],
            port: 8500,
            promisify: true,
        },
        services: [],  // 假如当前服务需要访问consul上的其它服务，这里填入其它服务package.json中的名称
        registerInfo: {
            tags: [
                'syntheticsWatermelon_local', // 项目名_环境
            ],
            check: {
                interval: '3s',
                notes: 'http service check',
                status: 'critical',
            },
        },
};

config.redis = {
   clients: {
        serviceHostCache: {  // 服务间彼此存储的ip和端口等数据
            port: 6379,   //在上面列表
            host: 'x.x.x.x',  //在上面列表
            password: '',
            db: 16,  //在上面列表
        },
    }
 }
 
//  plugin.js
exports.consul = {
  enable: true,
  package: 'egg-consul',
};
```

 



### 6. 使用

```
// 在代码中获取其它服务的随机一个ip和端口, 因为本地环境的特殊性，所以获取的也是测试服的其它服务。
const consulSdwk = require('egg-consul/app/index.js');

// 返回: { host: 'x.x.x.x:8809', error: null }, 第二个参数为注册的服务名
let urlObj = await consulSdwk.getRemoteServiceByName(this.app, 'growthUser');
```



