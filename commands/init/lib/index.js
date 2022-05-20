"use strict";

const fs = require("fs");
const path = require("path");
const fse = require("fs-extra");
const semver = require("semver");
const userHome = require("user-home");
const inquirer = require("inquirer");
const glob = require("glob");
const ejs = require("ejs");
const Command = require("@zhengke-cli-dev/command");
const log = require("@zhengke-cli-dev/log");
const Package = require("@zhengke-cli-dev/package");
const { spinnerStart, execAsync } = require("@zhengke-cli-dev/utils");
const getProjectTemplate = require("./getProjectTemplate");
const TYPE_PROJECT = "project";
const TYPE_COMPONENT = "component";
const TEMPLATE_TYPE_NORMAL = "normal";
const TEMPLATE_TYPE_CUSTOM = "custom";
const WHITE_COMMAND = ["npm", "cnpm", "yarn", "pnpm"];
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
      const projectInfo = await this.prepare();

      if (projectInfo) {
        log.verbose("projectInfo:", projectInfo);
        this.projectInfo = projectInfo;

        // 2. 下载模板
        await this.downloadTemplate();
        // 3. 安装模板
        await this.installTemplate();
      }
    } catch (e) {
      log.error(e.message);
    }
  }

  async installTemplate() {
    if (!this.templateInfo) throw new Error("项目模板信息不存在");
    if (!this.templateInfo.type) this.templateInfo.type = TEMPLATE_TYPE_NORMAL;

    if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
      // 标准安装
      this.installNormalTemplate();
    } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
      // 自定义安装
      this.installCustomTemplate();
    } else {
      throw new Error("项目模板信息无法识别");
    }
  }

  checkCommand(cmd) {
    if (WHITE_COMMAND.includes(cmd) >= 0) return cmd;
  }

  async execCommand({ command, errmsg }) {
    let result;
    if (command) {
      const cmdArray = command.split(" ");
      const cmd = this.checkCommand(cmdArray[0]);
      if (!cmd) throw new Error("命令不存在! 命令: ", command);
      const args = cmdArray.slice(1);

      result = await execAsync(cmd, args, {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    }
    if (result !== 0) throw new Error(errmsg);
  }

  // ejs 模板渲染
  async ejsRender(ignore) {
    const dir = process.cwd();
    const projectInfo = this.projectInfo;
    return new Promise((resolve, reject) => {
      glob(
        "**",
        {
          cwd: dir,
          ignore: ignore,
          nodir: true,
        },
        (err, files) => {
          if (err) reject(err);

          Promise.all(
            files.map((file) => {
              const filePath = path.join(dir, file);
              return new Promise((resolve1, reject1) => {
                ejs.renderFile(filePath, projectInfo, {}, (err, result) => {
                  if (err) reject1(err);
                  else {
                    // 将 ejs 渲染结果写入 package.json
                    fse.writeFileSync(filePath, result);
                    resolve1(result);
                  }
                });
              });
            })
          )
            .then(() => resolve())
            .catch((err) => reject(err));
        }
      );
    });
  }

  // 标准安装
  async installNormalTemplate() {
    log.verbose("templateInfo", this.templateInfo);

    // 1. 拷贝模板代码至当前目录
    let spinner = spinnerStart("正在安装模板");
    try {
      const templatePath = path.resolve(
        this.templateNpm.cacheFilePath,
        "template"
      );
      const targetPath = process.cwd();
      fse.ensureDirSync(templatePath);
      fse.ensureDirSync(targetPath);
      fse.copySync(templatePath, targetPath);
    } catch (e) {
      throw e;
    } finally {
      spinner.stop(true);
      log.success("模板安装成功");
    }

    const ignore = ["node_modules/**", "public/**"];

    await this.ejsRender(ignore);
    const { installCommand, startCommand } = this.templateInfo;

    // 2. 依赖安装
    await this.execCommand({
      command: installCommand,
      errmsg: "依赖安装过程中失败！ 请手动执行 npm install",
    });

    // // 3. 启动命令
    await this.execCommand({
      command: startCommand,
      errmsg: "项目启动过程失败, 请手动执行 npm run dev",
    });
  }

  // 自定义安装
  async installCustomTemplate() {}

  async downloadTemplate() {
    const { projectTemplate } = this.projectInfo;
    const templateInfo = this.template.find(
      (item) => item.npmName === projectTemplate
    );

    const targetPath = path.resolve(userHome, ".zhengke-cli-dev", "template");
    const storeDir = path.resolve(
      userHome,
      ".zhengke-cli-dev",
      "template",
      "node_modules"
    );

    const { npmName, version } = templateInfo;
    this.templateInfo = templateInfo;

    const templateNpm = new Package({
      targetPath: targetPath,
      storeDir: storeDir,
      packageName: npmName,
      packageVersion: version,
    });

    if (!(await templateNpm.exists())) {
      const spinner = spinnerStart("正在下载ing");

      try {
        await templateNpm.install();
      } catch (e) {
        throw new Error(e);
      } finally {
        spinner.stop(true);
        if (await templateNpm.exists()) {
          log.success("下载模板成功");
          this.templateNpm = templateNpm;
        }
      }
    } else {
      const spinner = spinnerStart("正在更新ing");

      try {
        await templateNpm.update();
      } catch (e) {
        throw new Error(e);
      } finally {
        spinner.stop(true);
        if (await templateNpm.exists()) {
          log.success("更新模板成功");
          this.templateNpm = templateNpm;
        }
      }
    }
  }

  async prepare() {
    // 0. 校验项目模板是否存在
    const template = await getProjectTemplate();
    if (!template || template.length === 0) throw new Error("项目模板不存在");
    this.template = template;

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
      // 2. 是否启动强制更新
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
    return this.getProjectInfo();
  }

  async getProjectInfo() {
    function isValidName(v) {
      return /^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(
        v
      );
    }

    let projectInfo = {};
    let isProjectNameValid = false;
    if (isValidName(this.projectName)) {
      isProjectNameValid = true;
      projectInfo.projectName = this.projectName;
    }

    // 1. 选择创建项目或组件
    const { type } = await inquirer.prompt({
      type: "list",
      name: "type",
      message: "请选择初始化类型",
      default: TYPE_PROJECT,
      choices: [
        { name: "项目", value: TYPE_PROJECT },
        { name: "组件", value: TYPE_COMPONENT },
      ],
    });

    log.verbose("type", type);

    if (type === TYPE_PROJECT) {
      // 2. 获取项目的基本信息
      const projectNamePrompt = {
        type: "input",
        name: "projectName",
        message: "请输入项目名称",
        default: "",
        validate: function (v) {
          const done = this.async();

          setTimeout(function () {
            // 1.首字符必须为英文字符
            // 2.尾字符必须为英文或数字，不能为字符
            // 3.字符仅允许"-_"
            if (!isValidName(v)) {
              done(`请输入合法的项目名称`);
              return;
            }
            done(null, true);
          }, 0);
        },
        filter: (v) => v,
      };

      const projectPrompt = [];

      if (!isProjectNameValid) projectPrompt.push(projectNamePrompt);

      projectPrompt.push(
        {
          type: "input",
          name: "projectVersion",
          message: "请输入项目版本号",
          default: "1.0.0",
          validate: function (v) {
            const done = this.async();

            setTimeout(function () {
              if (!!!semver.valid(v)) {
                done("请输入合法的版本号");
                return;
              }
              done(null, true);
            }, 0);
          },
          filter: (v) => {
            if (!!semver.valid(v)) return semver.valid(v);
            else return v;
          },
        },
        {
          type: "list",
          name: "projectTemplate",
          message: "请选择项目模板",
          choices: this.createTemplateChoice(),
        }
      );

      const project = await inquirer.prompt(projectPrompt);

      projectInfo = {
        ...projectInfo,
        type,
        ...project,
      };
    } else if (type === TYPE_COMPONENT) {
    }

    // 生成 className
    if (projectInfo.projectName) {
      projectInfo.className = require("kebab-case")(
        projectInfo.projectName
      ).replace(/^-/, "");
    }

    // 生成 version
    if (projectInfo.projectVersion)
      projectInfo.version = projectInfo.projectVersion;
    // return 项目的基本信息 (Object)
    return projectInfo;
  }

  createTemplateChoice() {
    return this.template.map((item) => ({
      value: item.npmName,
      name: item.name,
    }));
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
