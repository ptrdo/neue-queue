import Config from "./config";
import Auth from "comps-ui-auth";
import Notifier from "../node_modules/comps-ui/notifier/idmorg-notifier.js";
import Queue from "../../queue-chart.js";

class Index {

  constructor() {
    console.log("The Index module has been constructed!");
    Notifier.init({
      echo: true,
      prefix: false
    });
    if (!("idmnotifier" in window)) {
      window["idmnotifier"] = Notifier;
    }
    if (!("queue" in window)) {
      window["queue"] = Queue;
    }
  };

  render(rootElement=document) {
    
    let button = document.createElement("BUTTON");
    button.appendChild(document.createTextNode("Do It!"));
    button.setAttribute("style", "display:block;margin:0 auto;padding: 0.5em 1em;")
    button.addEventListener("click", function (event) {
      event.preventDefault();
      if (Queue.status()) {
        window.location.reload();
      } else {
        Queue.refresh();
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
        menu = menu.parentElement;
      }
      menu.classList.remove("active");
      Auth.signout(Config.appName);
    });

    setTimeout(function () {
      Notifier.alert("Ready!");
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