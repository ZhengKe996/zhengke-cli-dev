"use strict";

const axios = require("axios");

const BASE_URL = process.env.ZHENGKE_CLI_BASE_URL
  ? process.env.ZHENGKE_CLI_BASE_URL
  : "https://www.fanzhengke.top/npm";

const request = axios.create({
  baseURL: BASE_URL,
  timeout: 5000,
});

request.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
);

module.exports = request;
