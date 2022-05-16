"use strict";

const path = require("path");
const log = require("@zhengke-cli-dev/log");
const Package = require("@zhengke-cli-dev/package");

const SETTINGS = {
  init: "@zhengke-cli-dev/init",
};

const CACHE_DIR = "dependencies";

async function exec() {
  let targetPath = process.env.CLI_TARGET_PATH;
  const homePath = process.env.CLI_HOME_PATH;
  log.verbose("targetPath: ", targetPath);
  log.verbose("homePath: ", homePath);
  let storeDir = "";
  let pkg;

  const cmdObj = arguments[arguments.length - 1];
  const comName = cmdObj.name();
  const packageName = SETTINGS[comName];
  const packageVersion = "latest";

  if (!targetPath) {
    targetPath = path.resolve(homePath, CACHE_DIR); // 生成缓存路径

    storeDir = path.resolve(targetPath, "node_modules");

    pkg = new Package({
      targetPath: targetPath,
      packageName: packageName,
      storeDir: storeDir,
      packageVersion: packageVersion,
    });

    if (await pkg.exists()) {
      // 更新package
      await pkg.update();
    } else {
      // 安装package
      await pkg.install();
      console.log("安装");
    }
  } else {
    pkg = new Package({
      targetPath: targetPath,
      packageName: packageName,
      packageVersion: packageVersion,
    });
  }

  const rootFile = pkg.getRootFilePath();

  if (rootFile) {
    require(rootFile).apply(null, arguments);
  }
}
module.exports = exec;
