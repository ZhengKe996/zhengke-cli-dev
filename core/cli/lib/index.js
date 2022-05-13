"use strict";

module.exports = core;

const semver = require("semver");
const log = require("@zhengke-cli-dev/log");
const colors = require("colors/safe");
const userHome = require("user-home");
const pathExists = require("path-exists").sync;
const pkg = require("../package.json");
const constant = require("./const");

function core() {
  try {
    checkPkgVersion();
    checkNodeVersion();
    checkRoot();
    checkUserHome();
  } catch (e) {
    log.error(e.message);
  }
}

// 检查用户目录
function checkUserHome() {
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red("当前登录用户主目录不存在!"));
  }
}

// 检查root账户
function checkRoot() {
  const rootCheck = require("root-check");
  rootCheck();
}

// 检查Node版本号
function checkNodeVersion() {
  // 第一步 获取当前Node版本号
  const currentVersion = process.version;
  // 第二步 比对最低版本号
  const lowestNodeVersion = constant.LOWEST_NODE_VERSION;
  if (!semver.gt(currentVersion, lowestNodeVersion)) {
    throw new Error(
      colors.red(
        `zhengke-cli 需要安装 v${lowestNodeVersion} 以上版本的 Node.js`
      )
    );
  }
}
// 检查版本号
function checkPkgVersion() {
  log.info("cli", pkg.version);
}
