import _ from "lodash";
import Config from "config";

/**
 * QueueView
 * Dashboard visualiser of cluster traffic
 *
 * @author psylwester(at)idmod(dot)org
 * @version 1.00, 2019/07/22
 * @requires ES6, lodash
 *
 */

const QueueView = function(props) {

  /* STATIC */

  const MODE = {
    Simulations: "Simulations",
    WorkItems: "WorkItems"
  };

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

  /* CONFIG */

  const config = Object.assign({

    auth: function () { return "comps" in window ? window.comps.auth : window.idmauth },
    entity: MODE.Simulations,
    scoreSize: 24,
    mocked: false,
    mockRoot: ("comps" in window ? "/app/dashboard/data/" : "mock/"),
    mockPath: "Simulations/1/",
    endpoint: ("comps" in window ? "/api/" : _.get(Config,  "endpoint", "https://comps2.idmod.org/api/")),

    workFlowScopeInDays: 1,
    workFlowsActiveOnly: false,

    set workFlowScope (num) {
      this.workFlowScopeInDays = /^\d+\.?\d*$/.test(num) ? parseFloat(num) : 1; // default
    },
    get daysOfWorkFlows () {
      return this.workFlowScopeInDays;
    },
    set workFlowsActive (boo) {
      this.workFlowsActiveOnly = !!boo;
    },
    get activeWorkFlowsOnly () {
      return this.workFlowsActiveOnly;
    },

    set modeEntity (val) {
      this.entity = /work/i.test(val) ? MODE.WorkItems : MODE.Simulations;
    },
    set mockChoice (val) {
      this.mockPath = val;
    },
    set useMockData (opt) {
      if (this.mocked) {
        // local wins
      } else {
        this.mocked = !!opt;
      }
    },
    get isMocked () {
      return this.mocked;
    },
    get mockURL () {
      return (this.mockRoot + this.mockPath).replace(/\/\//,"/");
    },
    get isSimulations () {
      return this.entity === MODE.Simulations;
    },
    get mode () {
      return this.entity;
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

    /**
     * groomDates prepares Date values for human consumption.
     * @param {Object} data is the source of values to groom. 
     * @return {Object} the groomed data. 
     */
    groomDates: function (data) {
      const vitalizeMockDate = function (dateString) {
        let yesterday = new Date(Date.now() - (36 * 60 * 60 * 1000));
        let yesterdate = yesterday.toISOString().split("T")[0];
        let recently = new Date(Date.parse(yesterdate + "T" + dateString.split("T")[1]) + (16 * 60 * 60 * 1000));
        return recently.toISOString();
      };
      const dateTransform = function (node) {
        /* preprocess dates from service-supplied GMT to ui-conducive Local */
        let basisDate, basisString, elapsedHours;
        let basisISOString = _.get(node, "LastCreateTime", _.get(node, "DateCreated", null));
        if (_.has(node, "Related")) {
          basisISOString = _.get(_.first(node.Related), "DateCreated", null);
          node["RelatedCount"] = node.Related.length || 0;
        }
        if (!!basisISOString) {
          if (config.isMocked) {
            basisISOString = vitalizeMockDate(basisISOString);
          }
          basisDate = new Date(Date.parse(basisISOString));
          basisString = basisDate.toLocaleDateString("en-US",{ month: "long", day: "numeric", hour:"2-digit", minute:"2-digit", second:"2-digit" });
          elapsedHours = ((Date.now() - basisDate)/1000/60/60).toFixed(1);
          node["ElapsedHours"] = elapsedHours;
          node["ElapsedString"] = elapsedHours > .1 ? "~" + elapsedHours + " hrs ago": "moments ago";
          node["ElapsedStartString"] = basisString;
        }
      };
      if ("LastCreateTime" in data || "DateCreated" in data) {
        // likely a simple entity node
        dateTransform(data);
      } else if ("Normal" in data) {
        // likely a root collection of priority buckets
        Object.values(data).forEach(value => {
          if (Array.isArray(value)) {
            value.forEach(item => {
              dateTransform(item);
            });
          }
        });
      } else if (Array.isArray(data)) {
        // likely a collection update
        data.forEach(item => {
          dateTransform(item);
        });
      }
      return data;
    },

    /**
     * prepPriorities establishes priority buckets and scoring. 
     * @param {Object} data is likely a QueueState API Response.
     * @return {Object} the prepped data.
     */
    prepPriorities: function (data) {
      const scoreSizes = function (splits, max=config.scoreSize) {
        let result = [0];
        let split = max/Math.max(1, splits-1);
        let last = 0;
        while (last < max) {
          result.push(parseFloat((last+=split).toFixed(1)));
        }
        return result;
      };
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

    /**
     * merge assigns new info to any Collection by aligning existing Ids with incoming Ids.
     * @param {Object} data is the new info to merge into this Collection. 
     */
    merge: function(data) {
      let updates = this.groomDates(data);
      Object.values(this.output).forEach(value => {
        if (Array.isArray(value)) {
          value.forEach(item => {
            if ("ExperimentId" in item && item.ExperimentId in updates) {
              Object.assign(item,  updates[item.ExperimentId]);
            } else if ("Id" in item && item.Id in updates) {
              Object.assign(item,  updates[item.Id]); // TODO: SortOn LastCreateTime
            }
          });
        }
      });
    },

    /**
     * augment puts new info at a known target of data.
     * @param {Object} target is the destination of new info. 
     * @param {Object} source is the new info.
     * @param {Boolean} pristine maintains new info without grooming dates. 
     */
    augment: function(target, source, pristine) {
      Object.assign(target,  !!pristine ? source : this.groomDates(source));
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
      this.output = this.prepPriorities(this.groomDates(data));
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

  const scopeDate = function () {
    let hours = 24 * config.daysOfWorkFlows;
    return new Date(Date.now()-Math.floor(1000*60*60*hours)).toISOString();
  };

  /**
   * onClick handles view's click interactions.
   * @param {Event}
   */
  const onClick = function(event) {
    event.preventDefault();
    console.log("onClick", event);

    let arrow = event.target.closest("li[itemid]");
    if (!!arrow && !event.target.classList.contains("block")) {
      arrow.classList.toggle("active");
    } else {
      view.chart.querySelectorAll("li[itemid].active").forEach(tooltip => {
        tooltip.classList.remove("active");
      });
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

          if (_.has(item, "SimulationStateCount")) {
            li.setAttribute("itemid", item["ExperimentId"]);
            setQueueItemDetails(block, item);
            setQueueItemSegments(ul, item["SimulationStateCount"]);
          } else if (_.has(item, "Flow")) {
            li.setAttribute("itemid", item["Id"]);
            setQueueItemDetails(block, item);
            setQueueItemFlow(ul, item["Flow"]);
          } else if (_.has(item, "Related")) {
            // @TODO: update Workflow mock data
            li.setAttribute("itemid", item["WorkItemId"]);
            setQueueItemDetails(block, item);
            setQueueItemFlow(ul, item);
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
    const setQueueItemFlow = function (fragment, info) {
      info["Related"]
      .filter(item => item.ObjectType != "AssetCollection")
      .forEach(member => {
        let a = document.createElement("A");
        let li = document.createElement("LI");
        let val = document.createElement("VAR");
        let tip = document.createElement("INS");
        let type = member.ObjectType;
        if (/^Experiment$/i.test(type)) {
          setQueueItemSegments(fragment, member["SimulationStateCount"]);
          fragment.querySelector("li:last-of-type").style.marginRight = "22px";
        } else {
          tip.appendChild(document.createElement("B"));
          tip.classList.add("arrow");
          val.appendChild(document.createTextNode("Worker" in member ? member.Worker.Name : type));
          a.appendChild(val);
          li.appendChild(a);
          li.appendChild(tip);
          li.classList.add(member["State"]||member["SimulationState"], type);
          if (_.intersection(STATE.Active,li.classList.value.split(" ")).length > 0) {
            li.classList.add("process");
          }
          li.style.flexGrow = /^Work/i.test(type) ? 1 : 10;
          li.style.marginRight = "22px";
          fragment.appendChild(li);
        }
      });
      fragment.querySelector("li:last-of-type").style.marginRight = "0";
    };
    const setQueueItemDetails = function (fragment, info) {
      let implement = function (key) {
        let dd = document.createElement("DD");
        let name = document.createElement("VAR");
        let value = document.createElement("DATA");
        name.appendChild(document.createTextNode(key));
        value.appendChild(document.createTextNode(info[key]));
        dd.setAttribute("itemprop", key);
        dd.appendChild(name);
        dd.appendChild(value);
        dl.appendChild(dd);
      };
      let dfn = fragment.querySelector("DFN");
      let dl = document.createElement("DL");
      let dt = document.createElement("DT");
      dl.appendChild(dt);

      if (_.has(info, "SimulationStateCount")) {
        dt.appendChild(document.createTextNode("Experiment"));
        ["Owner","ExperimentId","NodeGroup","ElapsedString","SimulationCount"].forEach(implement);
      } else if (_.has(info, "Flow")) {
        dt.appendChild(document.createTextNode("Work Flow"));
        ["Owner","Id","EnvironmentName","ElapsedString","RelatedCount"].forEach(implement);
      } else if (_.has(info, "Related")) {
        dt.appendChild(document.createTextNode("Work Flow"));
        ["Owner","WorkItemId","EnvironmentName","ElapsedString","RelatedCount"].forEach(implement);
      }

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

  /* WORKFLOWS */

  const fetchWorkItems = function (successCallback, failureCallback)  {
    let scope = `,DateCreated%3E=${scopeDate()}`;
    let url = config.isMocked ? config.mockURL + "WorkItems.json" : `${config.endpoint}WorkItems?filters=isTopLevel=1,State!=Canceled,State!=Created${scope}&orderby=DateCreated%20desc&format=json`;
    getSecure(url)
    .then(data => {
      /* @TODO: QUALIFY WORKFLOWS BY PRIORITY! */
      collection.update({ "Normal": data.WorkItems });
      fetchWorkFlow(0);
    })
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
        console.error("queueView.fetchWorkItems", error);
      }
    })
    .finally(function () {
      console.log("Fetched ALL Work Items!");
    });
  };
  
  const fetchWorkFlow = function (cursor) {
    let item, guid, url;
    let source = collection.latest.Normal;
    if (-1 < cursor && cursor < source.length) {
      item = source[cursor];
      guid = _.get(item, "Id");
      if (!!item && !!guid) {
        url = config.isMocked ? config.mockURL + "Related.json" : `${config.endpoint}WorkItems/${guid}/Related?format=json`;
        getSecure(url)
        .then(data => {
          data.Related.unshift(_.clone(item));
          collection.augment(item,{ "Flow": data }, true);
          if ("Related" in data && data.Related.length > 0) {
            fetchWorkFlowItems(item, 0);
          } else {
            // this is a singular Work Item
          }
        })
        .catch(function (error) {
          ("queueView.fetchWorkFlow", error);
        })
        .finally(function () {
          fetchWorkFlow(cursor+1); // goto next
        });
      } else {
        fetchWorkFlow(cursor+1); // goto next
      }
      
    } else {

      // finish or continue
      console.log("Fetched ALL Related!");
      render();
    }
  };

  const fetchWorkFlowItems = function (item, cursor) {
    let relation, entity, guid, url;
    let flow = _.get(item, "Flow");
    if (!!flow && "Related" in flow && -1 < cursor && cursor < flow.Related.length) {
      relation = flow.Related[cursor];
      entity = _.get(relation, "ObjectType");
      guid = _.get(relation, "Id");
      if (!!entity && !!guid && /Simulation|Experiment|WorkItem/i.test(entity)) {
        url = `${config.endpoint}${entity}s/${guid}?format=json`;
        getSecure(url)
        .then(data => {
          collection.augment(relation, data[`${entity}s`][0]);
        })
        .catch(function (error) {
          ("queueView.fetchWorkFlowItems", error);
        })
        .finally(function () {
          fetchWorkFlowItems(item,cursor+1); // goto next
        });
      } else {
        fetchWorkFlowItems(item,cursor+1);
      }

    } else {

      // finish or continue
      // console.log("Fetched ALL Related Items!", item.Id);
    }

  };

  const getSecure = function(url) {
    return fetch(url, {
      method: "GET",
      cache: "no-cache",
      headers: {
        "X-COMPS-Token": config.auth().getToken()
      }
    }).then(response => response.json());
  };

  /* MOCK DEMO */

  const fetchMock = function (successCallback, failureCallback)  {
    let primary = config.isSimulations ? "Queue.json" : "WorkItemQueue.json";
    let secondary = config.isSimulations ? "Stats.json" : "Flows.json";
    fetch(config.mockURL + primary, { method:"GET" })
        .then(response => response.json())
        .then(data => collection.update(data.QueueState))
        .then(response => fetch(config.mockURL + secondary, { method:"GET" }))
        .then(response => response.json())
        .then(data => { collection.merge(data.Stats||data.Flows); return collection.latest; })
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
          console.log("Fetched Mock Data:", config.mockURL, primary, secondary);
        });
  };

  const addSourceSelect = function() {

    if (view.parent.querySelector("figcaption legend select")) {
      return;
    }

    const target = view.parent.querySelector("figcaption legend");
    const options = [
      { name:"API Simulations", value: 0, selected: true },
      { name:"API Work Items", value: 1 },
      { name:"MOCK Simulations 1", value: "Simulations/1/" },
      { name:"MOCK Simulations 2", value: "Simulations/2/" },
      { name:"MOCK Simulations 3", value: "Simulations/3/" },
      { name:"MOCK Work Items 1", value: "WorkItems/1/" },
      { name:"MOCK Work Items 2", value: "WorkItems/2/" },
      { name:"MOCK Work Items 3", value: "WorkItems/3/" },
      { name:"", value: "", disabled: true }
    ];
    let fragment = document.createDocumentFragment();
    let input = fragment.appendChild(document.createElement("SELECT"));
    let apis = input.appendChild(document.createElement("OPTGROUP"));
    let sims = input.appendChild(document.createElement("OPTGROUP"));
    let itms = input.appendChild(document.createElement("OPTGROUP"));
    options.forEach((item,index) => {
      let group = /^\d$/.test(item.value) ? apis : (new RegExp(MODE.Simulations)).test(item.value) ? sims : itms;
      let opt = group.appendChild(document.createElement("OPTION"));
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
        config.modeEntity = (new RegExp(MODE.Simulations)).test(event.target.value) ? MODE.Simulations : MODE.WorkItems;
        config.mockChoice = event.target.value;
        fetchMock(render, recoup);
      } else {
        config.mocked = false;
        config.modeEntity = event.target.value > 0 ? MODE.WorkItems : MODE.Simulations;
        if (config.isSimulations) {
          try {
            // proxy for dashboard.refreshMetric(name,interaction);
            config.api(config.mode,true);
          } catch (err) {
            console.error("An API was not established by the instantiator!", err);
          }
        } else {
          destroy(true);
          fetchWorkItems();
        }

        /* inelegant means to trigger an element of the parent view...
        let refresh = view.parent.querySelector("button.refresh");
        let click = new MouseEvent("click", {
          view: window,
          bubbles: true,
          cancelable: true
        });
        refresh.dispatchEvent(click);
         */
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
          fetchMock(() => {
            render(() => { /* callback */ });
          });
        }
      } else {

        // dangerous, but insulated by view and module.
        Object.assign(config, (overrides||{}));
        destroy(true); // TODO: Only if need be.
        collection.update(config.queue);
        collection.merge(config.stats);
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

    getMode: function() {
      return config.mode;
    },

    setScoreSize: function(value) {
      if (/^[1-9][0-9]$|[1-9]$/.test(value)) {

        config.scoreSize = parseInt(value);
        destroy(true);

        // @TODO: this.redraw(); // repreps existing data, rerenders.

        if (config.isMocked) {
          fetchMock(() => { render(); });
        } else {
          collection.update(config.queue);
          collection.merge(config.stats);
          render();
        }
      } else {
        console.warn("scoreSize requires an integer between 0-100 (default is 24).")
      }
    },

    isMocked: function() {
      return config.isMocked;
    },

    setWorkFlowsFilter: function(boo) {
      // @param {Boolean} true shows only active workflows, false shows all within scope (API only).
      config.workFlowsActive = boo;
      let message = config.activeWorkFlowsOnly ? "ONLY ACTIVE" : "ALL";
      console.log(`The Work Flow Queue will now show ${message} items found within scope!`);
    },

    setWorkFlowsScope: function(days) {
      // @param {Number} days to go back from now in collecting Top-Level Work Items (API only). 
      config.workFlowScope = days;
      let message = 1 >= config.daysOfWorkFlows ? " day!" : " days!";
      console.log(`The Work Flow Queue will now show items within the past ${config.daysOfWorkFlows+message}`);
    },

    status: function () {
      return Object.keys(collection.latest).length;
    }
  }
};

export default QueueView;