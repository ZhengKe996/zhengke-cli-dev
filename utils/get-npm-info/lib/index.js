"use strict";

const axios = require("axios");
const urljoin = require("url-join");
const semver = require("semver");

// 获取npm信息
function getNpmInfo(npmName, registry) {
  if (!npmName) return null;

  const registryUrl = registry || getDefaultRegistry();
  const npmInfoUrl = urljoin(registryUrl, npmName);
  return axios
    .get(npmInfoUrl)
    .then((res) => {
      if (!res.status === 200) return null;
      return res.data;
    })
    .catch((err) => {
      return Promise.reject(err);
    });
}
// 判断使用npm官网还是淘宝镜像
function getDefaultRegistry(isOriginal = false) {
  return isOriginal
    ? "https://registry.npmjs.org"
    : "https://registry.npm.taobao.org";
}

// 获取所有版本号
async function getNpmVersions(npmName, registry) {
  const data = await getNpmInfo(npmName, registry);

  if (!data) return [];

  return Object.keys(data.versions);
}

// 过滤大于基础版本号的所有版本
function getSemverVersions(baseVersion, versions) {
  versions = versions
    .filter((version) => semver.satisfies(version, `^${baseVersion}`))
    .sort((a, b) => semver.gt(b, a));
  return versions;
}

async function getNpmSemverVersions(baseVersion, npmName, registry) {
  const versions = await getNpmVersions(npmName, registry);
  const newVersions = getSemverVersions(baseVersion, versions);
  if (newVersions && newVersions.length > 0) return newVersions[0];
}
module.exports = {
  getNpmInfo,
  getNpmVersions,
  getSemverVersions,
  getNpmSemverVersions,
};
