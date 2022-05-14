"use strict";

const path = require("path");

module.exports = function (p) {
  if (p) {
    const sep = path.sep;
    if (sep !== "/") return p.replace(/\\g/, "/");
  }
  return p;
};
