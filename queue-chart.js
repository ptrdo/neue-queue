import templater from "microdata-template";
import _ from "lodash";

/**
 * queue-chart
 * Means to Monitor Progress of Work Processing on HPC Cluster
 *
 * @author psylwester(at)idmod(dot)org
 * @version 0.1.2, 2019/06/12
 * @requires ES6, microdata-template, lodash
 *
 */

/* CONFIG */

let config = {
  name: "queue-chart",
  type: "arrow",
  selector: "output[title=NeueQueue]",
  chartContainer:"NeueQueue",
  queue: [], // _.has(this.data, "QueueState") ? this.data["QueueState"] : [],
  stats: {}, // _.has(this.detailData, "Stats") ? this.detailData["Stats"] : {},
  useMockData: true,
  shuffle: false
};

/* STATIC */

const PRIORITY = {
  1: {
    key: "Highest",
    name: "Highest"
  },
  2: {
    key: "AboveNormal",
    name: "Above Normal"
  },
  3: {
    key: "Normal",
    name: "Normal"
  },
  4: {
    key: "BelowNormal",
    name: "Below Normal"
  },
  5: {
    key: "Lowest",
    name: "Lowest"
  }
};

const STATE = {
  "PreActive": [
    "Created",
    "QueuedForCommission",
    "CommissionRequested",
    "Commissioned",
    "Provisioning",
    "Validating"
  ],
  "Active": [
    "Running",
    "Waiting",
    "QueuedForResume",
    "ResumeRequested",
    "Resumed",
    "Retry"
  ],
  "PostActive": [
    "CancelRequested",
    "Canceling",
    "Canceled",
    "Failed",
    "Succeeded"
  ]
};

/* DATA */

const path = {
  root: "",
  queue: "Simulations",
  mocked: true,
  domain: {
    dev: "https://comps-dev.idmod.org/api",
    staging: "https://comps2.idmod.org/api",
    product: "https://comps.idmod.org/api",
    local: "./data"
  },
  entity: {
    Simulations: "Simulations",
    WorkItems: "WorkItems"
  },
  alternative: 1,
  api: {
    Queue: "/Metrics/Queue?EnvironmentName=Belegost&format=json",
    Stats: "/Experiment/Stats?statsoperations=simulationcount,simulationstatecount&format=json",
    Experiments: "/Experiments?format=json"
  },
  json: {
    Queue: "/WorkItemQueue.json",
    Stats: "/Stats.json",
    Experiments: "/Experiments.json"
  },
  set config (options) {
    Object.keys(options).forEach(key => {
      if (/mock/i.test(key)) {
        this.mocked = !!options[key];
      }
      if (/alt/i.test(key)) {
        this.alternative = parseInt(options[key]);
      }
      if (/entity|queue/i.test(key)) {
        if (options[key] in this.entity) {
          this.queue = this.entity[options[key]];
        }
      }
    });
    if (this.mocked) {
      this.root = [this.domain.local,this.queue,this.alternative].join("/");
    } else {
      this.root = this.domain.dev;
    }
  },
  get base () {
    return this.root;
  },
  get endpoint () {
    return this.mocked ? this.json : this.api;
  }
};

const collection = {

  output: {},

  prep: function (data) {

    const mockedData = true;

    const vitalizeMockDate = function (dateString) {
      let yesterday = new Date(Date.now() - (36 * 60 * 60 * 1000));
      let yesterdate = yesterday.toISOString().split("T")[0];
      let recently = new Date(Date.parse(yesterdate + "T" + dateString.split("T")[1]) + (16 * 60 * 60 * 1000));
      return recently.toISOString();
    };

    const dateTransform = function (node) {
      /* preprocess dates from service-supplied GMT to ui-conducive Local */
      let basis, basic, simple, elapsed;
      if (node.hasOwnProperty("LastCreateTime")) {
        if (mockedData) {
          node.LastCreateTime = vitalizeMockDate(node.LastCreateTime);
        }
        basis = new Date(Date.parse(node.LastCreateTime));
        basic = basis.toLocaleDateString("en-US",{ month: "long", day: "numeric", hour:"2-digit", minute:"2-digit", second:"2-digit" });
        simple = basis.toLocaleDateString("en-US",{ weekday:"short", hour:"2-digit", minute:"2-digit" });
        elapsed = ((Date.now() - basis)/1000/60/60).toFixed(1);
        node["LastCreateBasic"] = basic;
        node["LastCreateParts"] = simple.replace(/^(.*)(\d+\:\d+)(\s+)(.*)$/, "$1$2$4").split(/\s+/);
        node["ElapsedTime"] = elapsed;
      }
    };
    Object.values(data).forEach(value => {
      if (Array.isArray(value)) {
        value.forEach(item => {
          dateTransform(item);
        });
      }
    });
    Object.values(PRIORITY).forEach(bucket => {
      if(bucket.key in data) {} else {
        data[bucket.key] = [];
      }
    });
    return data;
  },

  merge: function(data) {
    Object.values(this.output).forEach(value => {
      if (Array.isArray(value)) {
        value.forEach(item => {
          if ("ExperimentId" in item && item.ExperimentId in data) {
            Object.assign(item,  data[item.ExperimentId]);
          }
        });
      }
    });
  },

  update: function (data) {
    this.output = this.prep(data);
    return this.output;
  },

  append: function (data) {
    this.merge(data);
    return this.output;
  },

  reset: function () {
    this.output = {};
  },

  get latest () {
    return this.output;
  }
};

const fetchAll = function (successCallback, failureCallback)  {

  path.config = { mocked: true };

  fetch(path.base+path.endpoint.Queue, { method:"GET" })
      .then(response => response.json())
      .then(data => collection.update(data.QueueState))
      .then(response => fetch(path.base+path.endpoint.Stats, { method:"GET" }))
      .then(response => response.json())
      .then(data => collection.append(data.Stats))
      .then(update => new Promise(function(resolve) {
        successCallback();
        setTimeout(function () {
          resolve(update);
        }, 0);
      }))
      .catch(function (error) {
        failureCallback(error);
      })
      .finally(function () {
        console.log("Done!");
      });

};

const refresh = function () {

  fetchAll(render, recoup);

};

/* VIEW */

const view = {

  container: null,

  set element(ele) {
    this.container = ele;
  },

  get element() {
    return this.container;
  }
};

/**
 * onClick handles view's click interactions
 * @param {Event}
 */
const onClick = function(event) {
  event.preventDefault();
  console.log("onClick", event);
};

/**
 * redraw is for view updates subsequent to render
 * @param {HTMLElement} rootElement
 */
const redraw = function (rootElement=document) {

};

/**
 * render is the initial view assembly
 * @param {HTMLElement} rootElement
 * @param {Function} callback
 */
const render = function (rootElement=document, callback) {

  let templated = false;
  let source = rootElement.querySelector("[itemscope]");
  let config = {
    name: "NeueQueue",
    type: "arrow",
    title: "A Neue Queue!",
    description: "On the Belegost Environment",
    css: "chart queue fullwidth",
    enabled: true
  };
  const setQueueBucket = function (parent, name) {
    let div = document.createElement("DIV");
    let ol = document.createElement("OL");
    let label = document.createElement("LABEL");
    label.appendChild(document.createTextNode(name));
    div.appendChild(ol);
    div.appendChild(label);
    div.classList.add("queue-bucket");
    parent.prepend(div);
    return div;
  };
  const setQueueItems = function (parent, key) {
    let doc = document.createDocumentFragment();
    let ol = parent.querySelector("OL");
    let data = collection.latest[key]||[];
    if (_.isEmpty(data)) {
      let li = document.createElement("LI");
      li.appendChild(document.createTextNode("empty"));
      ol.appendChild(li);
      parent.classList.add("empty");
    } else {
      data.forEach(item => {
        let li = document.createElement("LI");
        let ul = document.createElement("UL");
        doc.appendChild(li);
        li.appendChild(ul);
        if (_.has(item,  "SimulationStateCount")) {
          setQueueItemSegments(ul, item["SimulationStateCount"]);
        }
      })
      ol.appendChild(doc);
    }
  };
  const setQueueItemSegments = function (fragment, info) {
    let tip = document.createElement("INS");
    let block = document.createElement("LI");
    tip.appendChild(document.createElement("B"));
    block.appendChild(document.createElement("DFN"));
    tip.classList.add("arrow");
    block.classList.add("block");
    ["PreActive","Active","PostActive"].forEach(stage => {
      STATE[stage].forEach(status => {
        if (status in info) {
          let a = document.createElement("A");
          let li = document.createElement("LI");
          let val = document.createElement("VAR");
          li.classList.add(status);
          li.style.flexGrow = info[status];
          if (stage == "Active") {
            li.classList.add("process"); // TODO: consider the stage as className
          }
          val.appendChild(document.createTextNode(info[status]));
          a.appendChild(val);
          li.appendChild(a);
          fragment.appendChild(li);
        }
      });
    });
    fragment.prepend(block);
    fragment.querySelector("li:last-of-type").appendChild(tip);
  };

  if (!!view.element) {
    console.error(`${config.name} is already rendered!`, view.element);
  } else if (!!source) {
    if (templated) {
      templater.render(source, config);
    }
    view.element = rootElement.querySelector("[itemid=NeueQueue]");
    view.element.addEventListener("click", onClick);
    setTimeout(function () {
      let output = view.element.querySelector("output");
      for (let item in PRIORITY) {
        let bucket = setQueueBucket(output, PRIORITY[item].name);
        setQueueItems(bucket, PRIORITY[item].key);
      }
      if (!!callback && callback instanceof Function) {
        callback(view.element);
      }
    }, 0);
  } else {
    console.error(`${config.name} failed to render!`, collection.latest);
    if (!!callback && callback instanceof Function) {
      callback(null);
    }
  }
};

/**
 * recoup recovers gracefully from data access failure
 */
const recoup = function () {

};

/**
 * destroy removes view and resets caches
 */
const destroy = function () {
  /* TODO: formally remove event handlers */
  element.parentNode.removeChild(element);
  collection.reset();
};

const status = function () {
  return Object.keys(collection.latest).length  ;
};

const getData = function () {
  return collection.latest;
};

const configure = function (options) {
  Object.assign(config, (options || {}));
  return this;
};

/**
 * draw is backwards-compatibility to COMPS
 * @param {Object} overrides
 * @param {Function} callback
 */
const draw = function (overrides, callback) {
  Object.assign(config, (overrides || {}));
  render(document.getElementById("dashboard"), callback);
}

export default { draw, refresh, redraw, status, configure, getData, destroy };