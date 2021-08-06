module.exports = {
  logPlugin: (OpenApiTool, option) => {
    OpenApiTool.prototype.log = async function() {
      const openapi = await this.getOpenApi();
      if(option.log) {
        console.log(`共有${openapi.apis.length}个api接口`);
      }
    }
  }
}