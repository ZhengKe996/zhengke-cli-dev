"use strict";

const cp = require("child_process");

function isObject(o) {
  return Object.prototype.toString.call(o) === "[object Object]";
}

function exec(command, args, options) {
  const win32 = process.platform === "win32";

  const cmd = win32 ? "cmd" : command;
  const cmdArgs = win32 ? ["/c"].concat(command, args) : args;

  return require("child_process").spawn(cmd, cmdArgs, options || {});
}

function spinnerStart(msg, setSpinnerString = "|/-\\") {
  const Spinner = require("cli-spinner").Spinner;

  const spinner = new Spinner(`${msg}... %s`);
  spinner.setSpinnerString(setSpinnerString);
  spinner.start();
  return spinner;
}

function sleep(timeout = 1000) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

module.exports = { isObject, exec, spinnerStart, sleep };
