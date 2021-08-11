const OpenApiTool = require('openapi-tool');
const fs = require('fs')
const {resolve} = require('path')
const umi = require('umi-request');
const request = umi.extend();
const {logPlugin} = require('./plugin');

OpenApiTool.use(logPlugin, {
  log: true
});

const host = 'http://192.168.11.60:18000';
const swaggerResourcesUrl = `${host}/swagger-resources`;
const apiDocsUrl = `${host}/v2/api-docs`;

const microServiceMap = new Map();
microServiceMap.set('互动追踪', 'pool-interaction');
microServiceMap.set('客户管理模块', 'pool-customer');
microServiceMap.set('客户运营', 'pool-operation');
microServiceMap.set('企业管理模块', 'pool-corporate');
microServiceMap.set('群运营', 'pool-chat');
microServiceMap.set('上传模块', 'pool-upload');
microServiceMap.set('微信开放平台', 'pool-wxopen');
microServiceMap.set('引流助手模块', 'pool-helper');
microServiceMap.set('营销中心', 'pool-marketing');
microServiceMap.set('用户管理模块', 'pool-user');
microServiceMap.set('运营概览', 'pool-view');

const main = async () => {
  // 获取所有微服务
  const microservices = await request.get(swaggerResourcesUrl);
  const microservicesDir = resolve(__dirname, 'microservices');
  if (!fs.existsSync(microservicesDir)) {
    fs.mkdirSync(microservicesDir);
  }

  // 生成service文件，微服务名为一级目录，tag为二级目录
  microservices.forEach(async (microservice) => {
    const microserviceDir = resolve(__dirname, 'microservices', microservice.name);
    if (!fs.existsSync(microserviceDir)) {
      fs.mkdirSync(microserviceDir);
    }

    const microserviceJson = await request.get(apiDocsUrl, {
      headers: {
        'knfie4j-gateway-request': microservice.header
      }
    });
    if (microserviceJson.code === 404) {
      return;
    }

    const outputDir = resolve(microserviceDir);

    const prefix = `/${microServiceMap.get(microservice.name)}`; // 微服务前缀
    const openApiTool = new OpenApiTool({
      data: microserviceJson
    });
    await openApiTool.generateService({
      template: 'umi-request',
      outputDir,
      typescript: true,
      format: (openapi) => {
        openapi.apis.forEach(api => {
          // url带上微服务前缀
          api.request.url = `${prefix}${api.request.url}`;
          api.request.urlText = `${prefix}${api.request.urlText}`;

          // 把响应类型中的R和ResultBody转换成HttpResponse
          if(api.response.type === "R") {
            api.response.type = api.response.type.replace('R', 'HttpResponse');
          }else if(api.response.type === "ResultBody") {
            api.response.type = api.response.type.replace('ResultBody', 'HttpResponse');
          }else {
            api.response.type = api.response.type.replace('R<', 'HttpResponse<').replace('ResultBody<', 'HttpResponse<');
          }
        });

        // 把类型中的R和ResultBody转换成HttpResponse
        openapi.types.forEach(type => {
          if(type.name === 'R' || type.name === 'R<T>') {
            type.name = type.name.replace('R', 'HttpResponse');
          }

          if(type.name === 'ResultBody' || type.name === 'ResultBody<T>') {
            type.name = type.name.replace('ResultBody', 'HttpResponse');
          }
        });

        return openapi;
      }
    });
    openApiTool.log();
  });
}

main();