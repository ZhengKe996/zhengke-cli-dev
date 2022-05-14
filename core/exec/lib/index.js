"use strict";

const Package = require("@zhengke-cli-dev/package");

function exec() {
  // 1. targetPath -> modulePath
  // 2. modulePath -> Package(npm 模块)
  // 3. Package.getRootFile(获取入口文件)
  // 4. Package.update / Package.install
  const pkg = new Package();
  console.log(pkg);
}
module.exports = exec;
