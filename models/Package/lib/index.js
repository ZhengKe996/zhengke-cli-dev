"use strict";

const path = require("path");
const fse = require("fs-extra");
const log = require("@zhengke-cli-dev/log");
const colors = require("colors/safe");
const pkgDir = require("pkg-dir").sync;
const npmInstall = require("npminstall");
const pathExists = require("path-exists").sync;

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
    this.cacheFilePathPrefix = this.packageName.replace("/", "_");
  }

  async prepare() {
    if (this.storeDir && !pathExists(this.storeDir)) {
      fse.mkdirpSync(this.storeDir);
    }
    if (this.packageVersion === "latest") {
      // 查看具体版本号
      this.packageVersion = await getNpmSemverVsersion(this.packageName);
    }
  }

  get cacheFilePath() {
    return path.resolve(
      this.storeDir,
      `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`
    );
  }

  getSpecificCacheFilePath(packageVersion) {
    return path.resolve(
      this.storeDir,
      `_${this.cacheFilePathPrefix}@${packageVersion}@${this.packageName}`
    );
  }

  // 判断当前Package是否存在
  async exists() {
    try {
      if (this.storeDir) {
        await this.prepare();

        return pathExists(this.cacheFilePath);
      } else {
        return pathExists(this.targetPath);
      }
    } catch (e) {
      log.warn(colors.red(e.message));
    }
  }

  // 安装Package
  async install() {
    // 获取最新的npm模块版本号
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
  async update() {
    await this.prepare();

    // 1. 获取最新的npm模块版本号
    const latestPackageVersion = await getNpmSemverVsersion(this.packageName);

    // 2. 查询版本号对应路径是否存在
    const latestFilePath = this.getSpecificCacheFilePath(latestPackageVersion);
    // 3. 如果不存在，则直接安装最新的版本
    if (!pathExists(latestFilePath)) {
      await npmInstall({
        root: this.targetPath,
        storeDir: this.storeDir,
        registry: getDefaultRegistry(),
        pkgs: [
          {
            name: this.packageName,
            version: latestPackageVersion,
          },
        ],
      });
      this.packageVersion = latestPackageVersion;
    } else {
      this.packageVersion = latestPackageVersion;
    }
  }

  // 获取路口文件的路径
  getRootFilePath() {
    function _getRootFile(targetPath) {
      // 1. 获取 package.json 所在目录
      const dir = pkgDir(targetPath);
      if (dir) {
        // 2. 读取 package.json
        const pkgFile = require(path.resolve(dir, "package.json"));
        // 3. 寻找 main/lib
        if (pkgFile && pkgFile.main) {
          // 4. 路径的兼容(macOS/windows)
          return formatPath(path.resolve(dir, pkgFile.main));
        }
      }
      return null;
    }
    if (this.storeDir) {
      return _getRootFile(this.cacheFilePath);
    } else {
      return _getRootFile(this.targetPath);
    }
  }
}

module.exports = Package;
