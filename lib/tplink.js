/**
 * @package     tplink-cloud-api
 * @author      Alexandre Dumont <adumont@gmail.com>
 * @copyright   (C) 2017 - Alexandre Dumont
 * @license     https://www.gnu.org/licenses/gpl-3.0.txt
 * @link        http://itnerd.space
 */

/* This file is part of tplink-cloud-api.

tplink-cloud-api is free software: you can redistribute it and/or modify it
under the terms of the GNU General Public License as published by the Free
Software Foundation, either version 3 of the License, or (at your option) any
later version.

tplink-cloud-api is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with
tplink-cloud-api. If not, see http://www.gnu.org/licenses/. */

require("babel-polyfill");

const axios = require("axios");
const find = require("lodash.find");
const uuidV4 = require("uuid/v4");
const HS100 = require("./hs100");
const HS110 = require("./hs110");
const LB100 = require("./lb100");
const LB130 = require("./lb130");
const { checkError } = require("./api-utils");

class TPLink {
  constructor(token, termid) {
    this.token = token;
    this.termid = termid;
  }

  static async login(user, passwd, termid = uuidV4()) {
    if (!user) {
      throw new Error("missing required user parameter");
    } else if (!passwd) {
      throw new Error("missing required password parameter");
    }

    const params = {
      appName: "Kasa_Android",
      termID: termid,
      appVer: "1.4.4.607",
      ospf: "Android+6.0.1",
      netType: "wifi",
      locale: "es_ES"
    };

    const login_payload = {
      method: "login",
      url: "https://wap.tplinkcloud.com",
      params: {
        appType: "Kasa_Android",
        cloudPassword: passwd,
        cloudUserName: user,
        terminalUUID: termid
      }
    };

    const request = {
      method: "POST",
      url: "https://wap.tplinkcloud.com",
      params: params,
      data: login_payload,
      headers: {
        "User-Agent":
          "Dalvik/2.1.0 (Linux; U; Android 6.0.1; A0001 Build/M4B30X)"
      }
    };

    const response = await axios(request);
    checkError(response);
    const token = response.data.result.token;
    return new TPLink(token, termid);
  }

  getToken() {
    return this.token;
  }

  async getDeviceList() {
    const params = {
      appName: "Kasa_Android",
      termID: this.termid,
      appVer: "1.4.4.607",
      ospf: "Android+6.0.1",
      netType: "wifi",
      locale: "es_ES",
      token: this.token
    };

    const request = {
      method: "POST",
      url: "https://wap.tplinkcloud.com",
      params: { token: this.token },
      data: { method: "getDeviceList" }
    };

    const response = await axios(request);
    checkError(response);
    return (this.deviceList = response.data.result.deviceList);
  }

  // factory to return a new device object from a name (alias) or info object, { deviceType: ..., deviceModel: ... }
  newDevice(nameOrInfo) {
    if (!nameOrInfo) {
      throw new Error("missing required parameter nameOrInfo");
    } else if (
      typeof nameOrInfo !== "string" &&
      typeof nameOrInfo !== "object"
    ) {
      throw new Error(
        "invalid parameter type provided for nameOrInfo; expected string or object"
      );
    }

    let deviceInfo = nameOrInfo;
    if (typeof nameOrInfo === "string") {
      deviceInfo = this.findDevice(nameOrInfo);
    }

    // https://github.com/plasticrake/tplink-smarthome-api/blob/master/src/device/index.js#L113
    const type = deviceInfo.deviceType.toLowerCase();
    const model = deviceInfo.deviceModel;
    if (type.includes("bulb")) {
      if (model.includes("130")) {
        return new LB130(this, deviceInfo);
      }
      return new LB100(this, deviceInfo);
    } else if (type.includes("plug")) {
      if (model.includes("110")) {
        return new HS110(this, deviceInfo);
      }
      return new HS100(this, deviceInfo);
    } else {
      return new Device(this, deviceInfo);
    }
  }

  findDevice(alias) {
    const deviceInfo = find(this.deviceList, { alias: alias });
    if (!deviceInfo) {
      throw new Error("invalid alias: not found in device list");
    }
    return deviceInfo;
  }

  // for an HS100 smartplug
  getHS100(alias) {
    return new HS100(this, this.findDevice(alias));
  }

  // for an HS110 smartplug
  getHS110(alias) {
    return new HS110(this, this.findDevice(alias));
  }

  // for an LB100, LB110 & LB120
  getLB100(alias) {
    return new LB100(this, this.findDevice(alias));
  }
  getLB110(alias) {
    return this.getLB100(alias);
  }
  getLB120(alias) {
    return this.getLB100(alias);
  }

  // for an LB130 lightbulb
  getLB130(alias) {
    return new LB130(this, this.findDevice(alias));
  }
}

module.exports = TPLink;
