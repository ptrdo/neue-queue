import Config from "config";
import Auth from "comps-ui-auth";
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

    templater.render(
      rootElement.querySelector("#dashboard [itemscope]"),
      {
        name: "QueueView",
        type: "arrow",
        title: "Simulations Currently in Queue for Processing",
        description: "On the Belegost Environment",
        css: "chart queue fullwidth",
        enabled: true
      }
    );

    let queue = new Queue({
      type: "arrow",
      selector: "[itemid=QueueView]",
      chartContainer:"#QueueView",
      useMockData: true,
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
    });
    window["queue"] = queue;

    let refresh = rootElement.querySelector("[itemid=QueueView] button.refresh");
    refresh.addEventListener("click", function(event) {
      event.preventDefault();
      queue.draw();
    });
    
    let button = document.createElement("BUTTON");
    button.appendChild(document.createTextNode("Do It!"));
    button.setAttribute("style", "display:block;margin:0 auto;padding: 0.5em 1em;")
    button.addEventListener("click", function (event) {
      event.preventDefault();
      if (queue.status()) {
        window.location.reload();
      } else {
        queue.draw();
        this.innerText = "Reset";
      }
    });
    rootElement.appendChild(button);

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
        menu = menu.parentElement;s
      }
      menu.classList.remove("active");
      Auth.signout(Config.appName);
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