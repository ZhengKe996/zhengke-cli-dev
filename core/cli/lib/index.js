"use strict";

module.exports = core;

const path = require("path");
const semver = require("semver");
const commander = require("commander");
const log = require("@zhengke-cli-dev/log");
const init = require("@zhengke-cli-dev/init");
const colors = require("colors/safe");
const userHome = require("user-home");
const pathExists = require("path-exists").sync;
const args = require("minimist")(process.argv.slice(2));
const dotenv = require("dotenv");
const pkg = require("../package.json");
const constant = require("./const");
const program = new commander.Command();
async function core() {
  try {
    checkPkgVersion();
    checkNodeVersion();
    checkRoot();
    checkUserHome();
    // checkInputArgs();
    checkEnv();
    await checkGlobalUpdate();
    registerCommand();
  } catch (e) {
    log.error(e.message);
  }
}

// 命令注册
function registerCommand() {
  program
    .name(Object.keys(pkg.bin)[0])
    .usage("<command> [options]")
    .version(pkg.version)
    .option("-d, --debug", "是否开启调试模式", false);

  program
    .command("init [projectName]")
    .option("-f, --force", "是否强制初始化项目")
    .action(init);

  // 开启debug模式
  program.on("option:debug", function () {
    if (program.opts().debug) {
      process.env.LOG_LEVEL = "verbose";
    } else {
      process.env.LOG_LEVEL = "info";
    }
    log.level = process.env.LOG_LEVEL;
  });

  // 对未知命令监听
  program.on("command:*", function (obj) {
    const availableCommands = program.commands.map((cmd) => cmd.name());
    log.warn(colors.red("未知的命令: " + obj[0]));
    if (availableCommands.length > 0) {
      log.success(colors.green("可用命令: " + availableCommands.join(",")));
    }
  });

  program.parse(process.argv);

  if (program.args && program.args.length < 1) {
    program.outputHelp();
    console.info();
  }
}

// 检查是否需要全局更新
async function checkGlobalUpdate() {
  // 1. 获取当前版本号和模块名
  const currentVersion = pkg.version;
  const npmName = pkg.name;

  // 2. 调用npm API 获取所有版本号
  const { getNpmSemverVersions } = require("@zhengke-cli-dev/get-npm-info");
  const lastversion = await getNpmSemverVersions(currentVersion, npmName);

  // 3. 提取所有版本号，比对哪些版本号大于当前版本号
  if (lastversion && semver.gt(lastversion, currentVersion)) {
    log.warn(
      colors.yellow(
        `更新提示: 请手动更新 ${npmName}, 当前版本: ${currentVersion}, 最新版本为: ${lastversion},
        更新命令: npm install -g ${npmName}`
      )
    );
  }

  // 4. 获取最新的版本号，提示用户更新到该版本
}

// 检查环境变量
function checkEnv() {
  const dotenvPath = path.resolve(userHome, ".env");
  if (pathExists(dotenvPath)) {
    dotenv.config({
      path: dotenvPath,
    });
  }
  createDefaultConfig();
  log.verbose("环境变量", process.env.CLI_HOME_PATH);
}

function createDefaultConfig() {
  const cliConfig = {
    home: userHome,
  };
  if (process.env.CLI_HOME) {
    cliConfig["cliHome"] = path.join(userHome, process.env.CLI_HOME);
  } else {
    cliConfig["cliHome"] = path.join(userHome, constant.DEFAULT_CLI_HOME);
  }

  process.env.CLI_HOME_PATH = cliConfig.cliHome;
}

// 检查入参
function checkInputArgs() {
  checkArgs();
}

function checkArgs() {
  if (args.debug) {
    process.env.LOG_LEVEL = "verbose";
  } else {
    process.env.LOG_LEVEL = "info";
  }
  log.level = process.env.LOG_LEVEL;
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
