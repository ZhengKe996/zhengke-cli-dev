"use strict";

const log = require("@zhengke-cli-dev/log");
const Package = require("@zhengke-cli-dev/package");

const SETTINGS = {
  init: "@zhengke-cl-dev/init ",
};

function exec() {
  let targetPath = process.env.CLI_TARGET_PATH;
  const homePath = process.env.CLI_HOME_PATH;

  if (!targetPath) {
    // 生成缓存路径
  }

  const cmdObj = arguments[arguments.length - 1];
  const comName = cmdObj.name();
  const packageName = SETTINGS[comName];
  const packageVersion = "latest";

  const pkg = new Package({
    targetPath: targetPath,
    packageName: packageName,
    packageVersion: packageVersion,
  });

  console.log(pkg.getRootFilePath());
}
module.exports = exec;
