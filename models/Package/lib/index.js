"use strict";

const path = require("path");
const pkgDir = require("pkg-dir").sync;
const npmInstall = require("npminstall");

const { getDefaultRegistry } = require("@zhengke-cli-dev/get-npm-info");
const formatPath = require("@zhengke-cli-dev/format-path");
const { isObject } = require("@zhengke-cli-dev/utils");
class Package {
  constructor(options) {
    if (!options) throw new Error("Package类的options参数不能为空");
    if (!isObject(options)) throw new Error("Package类的options参数必须为对象");

    // Package 的存储路径
    this.targetPath = options.targetPath;

    // Package 的缓存路径
    this.storeDir = options.storeDir;
    // Package 的name
    this.packageName = options.packageName;

    // Package 的version
    this.packageVersion = options.packageVersion;
  }

  // 判断当前Package是否存在
  exists() {}
  // 安装Package
  install() {
    return npmInstall({
      root: this.targetPath,
      storeDir: this.storeDir,
      registry: getDefaultRegistry(),
      pkgs: [
        {
          name: this.packageName,
          version: this.packageVersion,
        },
      ],
    });
  }
  // 更新Package
  update() {}

  // 获取路口文件的路径
  getRootFilePath() {
    // 1. 获取Package.json所在目录
    const dir = pkgDir(this.targetPath);
    if (!dir) return null;

    // 2. 读取 Package.json
    const pkgFire = require(path.resolve(dir, "package.json"));

    // 3. 寻找 main/lib
    if (!pkgFire && !pkgFire.main) return null;
    // 4. 路径的兼容(macOS/windows)
    return formatPath(path.resolve(dir, pkgFire.main));
  }
}

module.exports = Package;
