"use strict";

const cp = require("child_process");
const path = require("path");
const log = require("@zhengke-cli-dev/log");
const Package = require("@zhengke-cli-dev/package");
const { exec: spawn } = require("@zhengke-cli-dev/utils");
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
    try {
      // 在当前进程调用
      // require(rootFile).call(null, Array.from(arguments));

      // 在node 子进程中调用
      const args = Array.from(arguments);
      const cmd = args[args.length - 1];
      const o = Object.create(null);
      Object.keys(cmd).forEach((key) => {
        if (
          cmd.hasOwnProperty(key) &&
          !key.startsWith("_") &&
          key !== "parent"
        ) {
          o[key] = cmd[key];
        }
      });
      args[args.length - 1] = o;
      const code = `require('${rootFile}').call(null, ${JSON.stringify(args)})`;
      const child = spawn("node", ["-e", code], {
        cwd: process.cwd(),
        stdio: "inherit",
      });
      child.on("error", (e) => {
        log.error(e.message);
        process.exit(1);
      });
      child.on("exit", (e) => {
        log.verbose("命令执行成功:" + e);
        process.exit(e);
      });
    } catch (e) {
      log.error(e.message);
    }
  }
}

module.exports = exec;
