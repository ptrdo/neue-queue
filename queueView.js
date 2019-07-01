import _ from "lodash";

/**
 * QueueView
 * Dashboard visualiser of cluster traffic
 *
 * @author psylwester(at)idmod(dot)org
 * @version 1.00, 2019/06/19
 * @requires ES6, lodash
 *
 */

const QueueView = function(props) {
  
  const config = Object.assign({
    
    scoreSize: 24,
    mocked: false,
    path: "mock/Simulations/1/",
    
    set useMockData (opt) {
      if (this.mocked) {
        // local wins
      } else {
        this.mocked = !!opt;
      }
    },
    get isMocked () {
      return this.mocked;
    }
    
  }, (props||{}));


  const view = {

    root: null,
    ouput: null,

    set parent(ele) {
      this.root = ele;
    },
    
    set chart(ele) {
      this.output = ele;
    },

    get parent() {
      return this.root;
    },
    
    get chart() {
      return this.output;
    }
  };

  const collection = {

    input: { 
      /* @TODO: Cache inputs for diff and refresh (of same) */
    },
    output: {},

    prep: function (data) {

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
          if (config.isMocked) {
            node.LastCreateTime = vitalizeMockDate(node.LastCreateTime);
          }
          basis = new Date(Date.parse(node.LastCreateTime));
          basic = basis.toLocaleDateString("en-US",{ month: "long", day: "numeric", hour:"2-digit", minute:"2-digit", second:"2-digit" });
          simple = basis.toLocaleDateString("en-US",{ weekday:"short", hour:"2-digit", minute:"2-digit" });
          elapsed = ((Date.now() - basis)/1000/60/60).toFixed(1);
          node["LastCreateBasic"] = basic;
          node["LastCreateParts"] = simple.replace(/^(.*)(\d+\:\d+)(\s+)(.*)$/, "$1$2$4").split(/\s+/);
          node["ElapsedTime"] = elapsed;
          node["Created"] = elapsed > .1 ? "~" + elapsed + " hrs ago": "moments ago"
        }
      };
      
      const scoreSizes = function (splits, max=config.scoreSize) { 
        let result = [0]; 
        let split = max/Math.max(1, splits-1); 
        let last = 0; 
        while (last < max) { 
          result.push(parseFloat((last+=split).toFixed(1))); 
        } 
        return result; 
      };
      
      Object.values(data).forEach(value => {
        if (Array.isArray(value)) {
          value.forEach(item => {
            dateTransform(item);
          });
        }
      });
      
      Object.values(PRIORITY).forEach(bucket => {
        if (bucket.key in data) {
          let counts = data[bucket.key].map((item) => { return item["SimulationCount"]; });
          let scores = counts.filter((v,i) => counts.indexOf(v) === i).sort((a,b)=>a-b).reverse();
          let sizes = scoreSizes(scores.length);
          data[bucket.key].forEach(function(item) {
            item.size = sizes[scores.indexOf(item["SimulationCount"])];
          });
        } else {
          // Response data won't have empty buckets.
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
    
    advance: function (rate=.1) {
      Object.values(this.output).forEach(value => {
        if (Array.isArray(value)) {
          value.forEach(item => {
            let advancing = Math.max(1,Math.ceil(item["SimulationCount"]*rate));
            for (let state in item["SimulationStateCount"]) {
              ["Active","PreActive"].forEach(stage => {
                if (STATE[stage].indexOf(state) > -1) {
                  let cohort = Math.min(item["SimulationStateCount"][state], advancing);
                  let upgrade = /Pre/.test(stage)?"Running":"Succeeded";
                  if (item["SimulationStateCount"][state] > cohort) {
                    item["SimulationStateCount"][state] -= cohort;
                  } else {
                    delete item["SimulationStateCount"][state];
                  }
                  // @TODO: Fail some? 
                  if (upgrade in item["SimulationStateCount"]) {
                    item["SimulationStateCount"][upgrade] += cohort;
                  } else {
                    item["SimulationStateCount"][upgrade] = cohort;
                  }
                }
              });
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
  
  /* UTILITIES */

  const wait = time => new Promise((resolve) => setTimeout(resolve, time));

  /* STATIC */

  const PRIORITY = {
    1: {
      key: "Highest",
      name: "Highest Priority"
    },
    2: {
      key: "AboveNormal",
      name: "Above Normal"
    },
    3: {
      key: "Normal",
      name: "Normal Priority"
    },
    4: {
      key: "BelowNormal",
      name: "Below Normal"
    },
    5: {
      key: "Lowest",
      name: "Lowest Priority"
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

  /**
   * onClick handles view's click interactions.
   * @param {Event}
   */
  const onClick = function(event) {
    event.preventDefault();
    console.log("onClick", event);
    
    let arrow = event.target.closest("li[itemid]");
    if (!!arrow) {
      arrow.classList.toggle("active");
    }
  };

  /**
   * unClick removes listeners to view's interaction.
   * @todo manage listeners
   */
  const unClick = function() {
    view.chart.removeEventListener("click", onClick);
  };
  
  const render = function(callback) {
    
    const setQueueBucket = function (parent, name) {
      let div = document.createElement("DIV");
      let ol = document.createElement("OL");
      let label = document.createElement("LABEL");
      label.appendChild(document.createTextNode(name));
      div.appendChild(label);
      div.appendChild(ol);
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
          let block = document.createElement("LI");
          let more = document.createElement("LI");
          let icon = document.createElement("I");
          
          icon.classList.add("material-icons"); 
          icon.appendChild(document.createTextNode("more_vert"));
          more.appendChild(icon);
          more.classList.add("more");

          block.appendChild(document.createElement("DFN"));
          block.classList.add("block");
          block.style.width = `${item.size}%`;
          
          doc.appendChild(li);
          li.appendChild(ul);
          ul.appendChild(block);
          ul.appendChild(more);

          if (_.has(item,  "SimulationStateCount")) {
            li.setAttribute("itemid", item["ExperimentId"]);
            setQueueItemDetails(block, item);
            setQueueItemSegments(ul, item["SimulationStateCount"]);
          } else {
            // @TODO: ORPHAN!
          }
        })
        ol.appendChild(doc);
      }
    };
    const setQueueItemSegments = function (fragment, info) {
      let tip = document.createElement("INS");
      tip.appendChild(document.createElement("B"));
      tip.classList.add("arrow");
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
            if (/Succeeded/.test(status)) {
              let median = document.createElement("TIME");
              median.classList.add("median");
              median.appendChild(document.createTextNode("0:00"))
              li.appendChild(median);
            }
            fragment.appendChild(li);
          }
        });
      });
      fragment.querySelector("li:last-of-type").appendChild(tip);
    };
    const setQueueItemDetails = function (fragment, info) {
      let dfn = fragment.querySelector("DFN");
      let dl = document.createElement("DL");
      let dt = document.createElement("DT");
      dt.appendChild(document.createTextNode("Experiment"));
      dl.appendChild(dt);
      ["Owner","ExperimentId","NodeGroup","Created","SimulationCount"].forEach(key => {
        let dd = document.createElement("DD");
        let name = document.createElement("VAR");
        let value = document.createElement("DATA");
        name.appendChild(document.createTextNode(key));
        value.appendChild(document.createTextNode(info[key]));
        dd.setAttribute("itemprop", key);
        dd.appendChild(name);
        dd.appendChild(value);
        dl.appendChild(dd)
      });
      dfn.classList.add("tooltip");
      dfn.appendChild(dl);
    };

    if (!!view.chart) {
      
      console.error(`${config.chartContainer} is already rendered!`, view.element);
      if (!!callback && callback instanceof Function) {
        callback(view.element);
      }
      
    } else {

      view.parent = document.querySelector(config.selector);
      view.chart = view.parent.querySelector(config.chartContainer);
      view.chart.addEventListener("click", onClick);
      view.chart.classList.add("process");
      
      // setTimeout(function () {
        for (let item in PRIORITY) {
          let bucket = setQueueBucket(view.chart, PRIORITY[item].name);
          setQueueItems(bucket, PRIORITY[item].key);
        }
        addSourceSelect();
        if (!!callback && callback instanceof Function) {
          callback(view.element);
        }
      // }, 0);

      wait(300).then(() => view.chart.classList.remove("process"));
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
  const destroy = function (reset) {
    if (!!view.chart) {
      unClick();
      while (view.chart.firstChild) {
        view.chart.removeChild(view.chart.firstChild);
      }
      view.chart = null;
    }
    if (!!reset) {
      collection.reset();
    }
  };

  /* MOCK DEMO */

  const fetchMock = function (path=config.path, successCallback, failureCallback)  {
    config.path = path;
    fetch(path + "QueueState.json", { method:"GET" })
    .then(response => response.json())
    .then(data => collection.update(data.QueueState))
    .then(response => fetch(path + "Stats.json", { method:"GET" }))
    .then(response => response.json())
    .then(data => collection.append(data.Stats))
    .then(update => new Promise(function(resolve) {
      if (successCallback && successCallback instanceof Function) {
        successCallback();
      }
      setTimeout(function () {
        resolve(update);
      }, 0);
    }))
    .catch(function (error) {
      if (failureCallback && failureCallback instanceof Function) {
        failureCallback(error);
      } else {
        console.error("queueView.fetchMock", error);
      }
    })
    .finally(function () {
      console.log("Fetched Mock Data from:", path);
    });
  };
  
  const addSourceSelect = function() {
    
    if (view.parent.querySelector("figcaption legend select")) {
      return;
    }
    
    const target = view.parent.querySelector("figcaption legend"); 
    const options = [
      { name:"API Simulations", disabled: true },
      { name:"API Work Items", disabled: true },
      { name:"MOCK Simulations 1", value: "mock/Simulations/1/", selected: true },
      { name:"MOCK Simulations 2", value: "mock/Simulations/2/" },
      { name:"MOCK Simulations 3", value: "mock/Simulations/3/" },
      { name:"MOCK Work Items 1", balue: "mock/WorkItems/1/" }
    ];
    let fragment = document.createDocumentFragment();
    let input = fragment.appendChild(document.createElement("SELECT"));
    options.forEach((item,index) => {
      let opt = input.appendChild(document.createElement("OPTION"));
      opt.innerText = item.name;
      opt.setAttribute("value", item.value||index);
      if (item.disabled) {
        opt.setAttribute("disabled", true);
      }
      if (item.selected) {
        opt.setAttribute("selected", true);
      }
    });
    target.prepend(fragment);
    input.addEventListener("change", function(event) {
      event.preventDefault();
      if (!/^[0-9]$/.test(event.target.value)) {
        config.mocked = true;
        destroy(true);
        fetchMock(event.target.value, render, recoup);
      } else {
        config.mocked = false;
        // inelegant, but this select-option feature is only temporary.
        let refresh = view.parent.querySelector("button.refresh");
        let click = new MouseEvent("click", {
          view: window,
          bubbles: true,
          cancelable: true
        });
        refresh.dispatchEvent(click);
      }
    });
  };
  
  return {

    /**
     * draw is the backwards-compatible interface called from dashboard/view.
     * @TODO: Auth expiry can spur subsequent draws. 
     * 
     * @public called upon initial render and subsequent refresh (click). 
     * @param {Object} overrides (optional) modification since instantiation.
     * @param {Function} callback (optional) code to execute upon render (at dashboard/view).
     * @return null
     */
    draw: function(overrides, callback) {
      
      if (config.isMocked) {
        if (!!view.chart) {
          collection.advance();
          destroy();
          render(() => { /* callback */ });
          return;
        } else {
          fetchMock(config.path, () => {
            render(() => { /* callback */ });
          });
        }
      } else {
        
        // dangerous, but insulated by view and module.
        Object.assign(config, (overrides||{}));
        destroy(true); // TODO: Only if need be.
        collection.update(config.queue);
        collection.append(config.stats);
        render(callback);
      }
    },
    
    redraw: function(overrides) {
      console.log("redraw!", overrides);
    },
    
    getView: function() {
      return view;
    },
    
    getCollection: function() {
      return collection.latest;
    },
    
    getConfig: function() {
      return config;
    },
    
    setScoreSize: function(value) {
      if (/^[1-9][0-9]$|[1-9]$/.test(value)) {
        
        config.scoreSize = parseInt(value);
        destroy(true);
        
        // @TODO: this.redraw(); // repreps existing data, rerenders.
        
        if (config.isMocked) {
          fetchMock(config.path, () => { render(); });
        } else {
          collection.update(config.queue);
          collection.append(config.stats);
          render();
        }
      } else {
        console.warn("scoreSize requires an integer between 0-100 (default is 24).")
      }
    },
    
    isMocked: function() {
      return config.isMocked;
    },

    status: function () {
      return Object.keys(collection.latest).length;
    }
  }
};

export default QueueView;