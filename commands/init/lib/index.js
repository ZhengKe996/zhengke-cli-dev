"use strict";

const fs = require("fs");
const fse = require("fs-extra");
const inquirer = require("inquirer");
const Command = require("@zhengke-cli-dev/command");
const log = require("@zhengke-cli-dev/log");

class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || "";
    this.force = !!this._argv[1].force;
    log.verbose("projectName", this.projectName);
    log.verbose("force", this.force);
  }

  async exec() {
    try {
      // 1. 准备阶段
      const res = await this.prepare();
      console.log(res, "---> xxx");
      if (res) {
        // 2. 下载模板
        // 3. 安装模板
        console.log("下载");
      }
    } catch (e) {
      log.error(e.message);
    }
  }

  async prepare() {
    // 1. 判断当前目录是否为空
    const localPath = process.cwd();
    if (!this.isDirEmpty(localPath)) {
      let ifContinue = false;
      if (!this.force) {
        // 询问是否继续创建
        ifContinue = (
          await inquirer.prompt({
            type: "confirm",
            name: "ifContinue",
            default: false,
            message: "当前文件夹不为空,是否继续创建项目",
          })
        ).ifContinue;

        // 不继续创建 终止执行
        if (!ifContinue) return;
      }
      if (ifContinue || this.force) {
        // 给用户做二次确认的机会
        const { confirmDelete } = await inquirer.prompt({
          type: "confirm",
          name: "confirmDelete",
          default: false,
          message: "⚠️  是否确认清空当前目录下所有文件 当前操作没有后悔药!",
        });

        if (confirmDelete) {
          // 清空当前目录
          fse.emptyDirSync(localPath);
        }
      }
    }
    // 2. 是否启动强制更新
    // 3. 选择创建项目或组件
    // 4. 获取项目的基本信息
  }

  isDirEmpty(localPath) {
    let fileList = fs.readdirSync(localPath);
    // 文件过滤逻辑
    fileList = fileList.filter(
      (file) => !file.startsWith(".") && ["node_modules"].indexOf(file) < 0
    );
    return !fileList || fileList.length <= 0;
  }
}

function init(argv) {
  return new InitCommand(argv);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
