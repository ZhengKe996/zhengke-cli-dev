"use strict";

const path = require("path");
const pkgDir = require("pkg-dir").sync;
const npmInstall = require("npminstall");
const pathExists = require("path-exists");

const {
  getDefaultRegistry,
  getNpmSemverVsersion,
} = require("@zhengke-cli-dev/get-npm-info");
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

    // Package 的缓存目录前缀
    this.npmCacheFilePathPrefix = this.packageName.replace("/", "_");
  }

  async prepare() {
    // 查看具体版本号
    if (this.packageVersion === "latest") {
      this.packageVersion = await getNpmSemverVsersion(this.packageName);
    }
  }

  get cacheFilePath() {
    return path.resolve(
      this.storeDir,
      `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`
    );
  }

  // 判断当前Package是否存在
  async exists() {
    if (this.storeDir) {
      await this.prepare();
      console.log(this.cacheFilePath);
      return pathExists(this.cacheFilePath);
    } else {
      return pathExists(this.targetPath);
    }
  }
  // 安装Package
  async install() {
    await this.prepare();
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
