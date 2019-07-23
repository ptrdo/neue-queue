import "jquery";
import Config from "config";
import Auth from "comps-ui-auth";

import Index from "./index.js";

let index = new Index();
let element;

const hello = function () {
  alert("Welcome!");
};

const init = function () {
  element = document.getElementById("dashboard");
  index.render(element);
  Auth.init({
    ApplicationName: Config.appName,
    endpoint: Config.endpoint
  });
  if (!("idmauth" in window)) {
    window["idmauth"] = Auth;
  }
  if (!("demo" in window)) {
    window["demo"] = {};
  }
};

document.addEventListener("DOMContentLoaded", init);