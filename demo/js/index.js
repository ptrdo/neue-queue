import Config from "config";
// import Auth from "comps-ui-auth";
import Postette from "../node_modules/postette/postette.js";
import templater from "microdata-template";
import Queue from "../../queueView.js";

class Index {

  constructor() {
    console.log("The Index module has been constructed!");
    Postette.init({
      echo: true,
      prefix: false
    });
    if (!("postette" in window)) {
      window["postette"] = Postette;
    }
  };

  render(rootElement=document) {

    const config = {
      Simulations: {
        name: "QueueView",
        title: "Simulations Currently in Queue",
        description: "On the Belegost Environment",
        css: "chart queue fullwidth",
        enabled: true,
        type: "arrow",
        selector: "[itemid=QueueView]",
        chartContainer:"#QueueView",
        useMockData: true,
        mockPath: "Simulations/1/",
        modeEntity: "Simulations",
        api: function(mode,refresh) {
          if (!!mode) {
            this.modeEntity = /sim/i.test(mode) ? "Simulations" : "WorkItems";
          }
          if (!!refresh) {
            // refreshMetric("QueueView", true);
            alert("There is no controller to GET this data!");
          }
        }
      },
      WorkItems: {
        name: "QueueViewFlows",
        title: "Workflows Currently Processing",
        description: "On All Environments Available to You",
        css: "chart queue fullwidth",
        enabled: true,
        type: "arrow",
        selector: "[itemid=QueueViewFlows]",
        chartContainer:"#QueueViewFlows",
        useMockData: true,
        mockPath: "WorkItems/1/",
        modeEntity: "WorkItems",
        api: function(mode,refresh) {
          if (!!mode) {
            this.modeEntity = /sim/i.test(mode) ? "Simulations" : "WorkItems";
          }
          if (!!refresh) {
            // refreshMetric("QueueViewFlows", true);
            alert("There is no controller to GET this data!");
          }
        }
      }
    };

    const subset = (obj, ...keys) => keys.reduce((a, c) => ({ ...a, [c]: obj[c] }), {});

    let mode = ["Simulations","WorkItems"];
    const init = function () {
      let ele = rootElement.querySelector("#dashboard [itemscope]");
      templater.clear(ele);
      templater.render(
        ele,
        subset(config[mode[0]], "name","type","title","description","css","enabled")
      );

      let queue = new Queue(subset(config[mode[0]], "type","selector","chartContainer","useMockData","mockPath","modeEntity","api"));
      window["queue"] = queue;
    };

    init();

    let refresh = rootElement.querySelector("[itemid=QueueView] button.refresh");
    refresh.addEventListener("click", function(event) {
      event.preventDefault();
      queue.draw();
    });

    let fieldset = document.createElement("FIELDSET");
    rootElement.querySelector(".wrap").appendChild(fieldset);
    
    let reset = document.createElement("BUTTON");
    reset.setAttribute("name","reset");
    reset.setAttribute("title","render/reset this application");
    ["Do It!", "Reset"].forEach(term => {
      let span = document.createElement("SPAN");
      span.appendChild(document.createTextNode(term));
      reset.appendChild(span);
    });
    reset.addEventListener("click", function (event) {
      event.preventDefault();
      if (queue.initialized()) {
        window.location.reload();
      } else {
        queue.draw();
        document.body.classList.add("ready");
      }
    });
    fieldset.appendChild(reset);

    let source = document.createElement("BUTTON");
    source.setAttribute("name","source");
    source.setAttribute("title","toggle select-option for sources");
    source.appendChild(document.createTextNode("Sources"));
    source.addEventListener("click", function (event) {
      event.preventDefault();
      queue.toggleMockSelect();
      if (!queue.initialized()) {
        reset.click();
      }
    });
    fieldset.appendChild(source);

    let modes = document.createElement("BUTTON");
    modes.setAttribute("name","modes");
    modes.setAttribute("title","toggle between Simulations and Work Items");
    modes.appendChild(document.createTextNode("Modes"));
    modes.addEventListener("click", function (event) {
      event.preventDefault();
      mode.reverse();
      init();
      document.body.classList.remove("ready");
    });
    fieldset.appendChild(modes);

    let authMenu = document.querySelector("a.nav-account");
    authMenu.addEventListener("click", function (event) {
      let menu = event.target;
      while (!/^(LI|MENU)$/i.test(menu.nodeName)) {
        menu = menu.parentElement;
      }
      menu.classList.toggle("active"); 
    });
    
    let authToggle = document.querySelector("a[data-action=session]");
    authToggle.addEventListener("click", function (event) {
      let menu = event.target;
      while (!menu.classList.contains("active")) {
        menu = menu.parentElement;
      }
      menu.classList.remove("active");
      // Auth.signout(Config.appName);
    });

    setTimeout(function () {
      Postette.alert("Ready!");
      document.documentElement.setAttribute("data-useragent", navigator.userAgent);
      window.addEventListener("touchstart", function onFirstTouch() {
        document.body.classList.add("touch");
        window.removeEventListener('touchstart', onFirstTouch, false);
      }, false);
    }, 0);

  };

  load() {};
  unload() {};
}

export default Index;