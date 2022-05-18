const request = require("@zhengke-cli-dev/request");

module.exports = function () {
  return request({
    url: "/project/getTemplate",
  });
};
