import _ from "lodash";
import Config from "config"; // COMPS: disable this import
import * as repro from "./demo/data/repro.json"; // COMPS: "../data/repro.json"

/**
 * QueueView
 * Dashboard visualiser of cluster traffic
 *
 * @author psylwester(at)idmod(dot)org
 * @version 2.6.0, 2019/08/22
 * @requires ES6, lodash
 *
 */

const QueueView = function(props) {

  /* STATIC */

  const MODE = {
    Simulations: "Simulations",
    WorkItems: "WorkItems"
  };

  const REPRO = {
    enabled: false,
    mode: MODE.Simulations,
    data: _.get(repro, "default", { Highest:[],AboveNormal:[],Normal:[],BelowNormal:[],Lowest:[] }),
    toggle: function(mode) {
      this.mode = mode; 
      this.enabled = !this.enabled
    }
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
      "Orphan",
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
   * nullAuth supplants COMPS-UI-Auth when unavailable (e/g when dev without access to private repositories).
   * @see this.config.auth
   * @property {Function} getToken
   * @property {Function} getUserNane
   * @property {Function} tokenIsWaning
   * @property {Function} refreshCredentials
   */
  const nullAuth = { 
    getToken: () => "", 
    getUserName: () => "",
    tokenIsWaning: () => false,
    refreshCredentials: function(token, successHandler, failureHandler) {
      if (!!successHandler && successHandler instanceof Function) {
        successHandler();
      }
    }
  };

  /* CONFIG */

  /**
   * config are application settings, populated/overriden as necessary upon instantiation.
   * NOTE: Setters here will process incoming values of the same key as the setter name.
   *
   * @private
   * @property {Function} auth() will call whatever auth exists for project, or nullAuth when none.
   * @property {String} cacheToken (and set/get) stores Token for looping fetches.
   * @property {String} entity (and set/get) is the entity type being charted.
   * @property {Integer} scoreSize (and set/get) is differentiating scale factor (range:0-100, default:24).
   * @property {Boolean} mocked (and set/get) is flag for diverting from API to mocked Response data (default:false).
   * @property {String} mockRoot is variable path to the mocked Response resources.
   * @property {String} mockPath is the directory path of the current mocked resource.
   * @property {String} endpoint is the relative or absolute path to API.
   * @property {Float} workFlowScopeInDays (and get/set) is DateCreated ago to search for Work Items (default:0).
   * @property {Boolean} workFlowsActiveOnly (and get/set) filters Work Items to active or all (default:false).
   * @property {Integer} truncateMin is the number of items viewable in any Priority Bucket prior to truncation.
   * @property {Integer} truncateMax is the maximum number of items total to be shown in a queue.
   * @property {Boolean} debug (and get/set) when true, traces JSON.stringify(collection.last) per render.
   */
  const config = Object.assign({

    auth: function () { return "comps" in window ? window.comps.auth : "idmauth" in window ? window.idmauth : nullAuth},
    cacheToken: "",
    recycleToken: function(erase) {
      this.cacheToken = erase ? "" : this.auth().getToken();
    },
    get token () {
      return this.cacheToken;
    },
    
    entity: MODE.Simulations,
    scoreSize: 24,
    mocked: false,
    mockRoot: ("comps" in window ? "/app/dashboard/data/" : "/data/"),
    mockPath: "",
    endpoint: ("comps" in window ? "/api/" : _.get(Config,  "endpoint", "https://comps-dev.idmod.org/api/")),

    workFlowScopeInDays: 0,
    workFlowsActiveOnly: true,

    truncateMin: 6,
    truncateMax: 100,

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
    get isWorkItems () {
      return this.entity === MODE.WorkItems;
    },
    get mode () {
      return this.entity;
    },
    
    debug: false,
    set logging (boo) {
      this.debug = !!boo;
    },
    get debugging () {
      return this.debug;
    }

  }, (props||{}));

  /**
   * view is the resource of DOM elements of concern here.
   *
   * @private
   * @property {HTMLElement} root (get/set parent) is the templated element.
   * @property {HTMLElement} output (get/set chart) is the chart container.
   * @property {HTMLElement} figure (getter) is the intermediate element.
   *
   */
  const view = {

    root: document.querySelector("[itemid=QueueView]"),
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

    get figure() {
      return this.root.querySelector("figure") || this.root;
    },

    get chart() {
      return this.output;
    }
  };

  /**
   * collection receives, transforms, and supplies data for display.
   *
   * @private
   * @property {Object} input (unused) is internal cache of Request Response.
   * @property {Object} output is the coalesced and transformed data for display.
   */
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
          node["RelatedCount"] = node["Related"].length || 0;
        }
        if (!!basisISOString) {
          if (config.isMocked) {
            basisISOString = vitalizeMockDate(basisISOString);
          }
          basisDate = new Date(Date.parse(basisISOString));
          basisString = basisDate.toLocaleDateString("en-US",{ month: "long", day: "numeric", hour:"2-digit", minute:"2-digit", second:"2-digit" });
          elapsedHours = ((Date.now() - basisDate)/1000/60/60).toFixed(2);
          node["ElapsedHours"] = elapsedHours;
          node["Elapsed"] = parseFloat(elapsedHours) > .05 ? "~" + elapsedHours + " hrs": "moments";
          node["ElapsedStartString"] = basisString;
        }
      };
      if ("LastCreateTime" in data || "DateCreated" in data) {
        // likely a simple entity node
        dateTransform(data);
      } else if (_.intersection(_.map(PRIORITY, "key"), Object.keys(data)).length > 0) {
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
            item.ViewSize = sizes[scores.indexOf(item["SimulationCount"])];
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
     * findItemById is a deep search for a node containing the given GUID. 
     * @param {String} guid is the identifier to search for.
     * @returns {null|Object} the node found, or null if not. 
     */
    findItemById: function(guid) {
      let found = null;
      for (let bucket in this.output) {
        let related, entity = _.find(this.output[bucket], function(item) { 
          let match = guid === item.Id || guid === item.ExperimentId; 
          if (!match && _.has(item, "Flow.Related")) {
            item.Flow.Related.forEach(relation => {
              if (guid === relation.Id || guid === relation.ExperimentId) {
                related = relation; 
              }
            });
          }
          return match;
        });
        if (!!entity || !!related) {
          found = entity||related;
          break;
        }
      }
      return found; 
    },

    /**
     * findItemsById is a deep search for node(s) containing the given GUID.
     * @param {String} guid is the identifier to search for.
     * @returns {Collection} an Array of node(s) found, or [] if none.
     */
    findItemsById: function(guid) {
      let found = [];
      for (let bucket in this.output) {
        this.output[bucket].forEach(item => {
          if (guid === item.Id || guid === item.ExperimentId) {
            found.push(item);
          } else if (_.has(item, "Flow.Related")) {
            item.Flow.Related.forEach(relation => {
              if (guid === relation.Id || guid === relation.ExperimentId) {
                found.push(relation);
              }
            });
          }
        });
      }
      return found;
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

    /**
     * advance emulates a passage of time by moving mock data through states toward completion.
     * @param {Number} rate is the relative speed to progress items (default:0.1).
     */
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

    /**
     * update is the primary setter of new Request Response data.
     * @param data
     * @return {collection.output|{}}
     */
    update: function (data) {
      this.output = this.prepPriorities(this.groomDates(data));
      return this.output;
    },

    reset: function () {
      this.output = {};
    },
    
    get count () {
      return _.flatMap(Object.values(this.output)).length;
    },

    /**
     * latest provides the currently assembled data of queue.
     * NOTE: Can by hijacked by REPRO settings to render repro.json.
     * @returns {Collection} the Object of Arrays of Objects.
     */
    get latest () {
      if (REPRO.enabled) {
        if (REPRO.mode === MODE.Simulations && config.isSimulations) {
          return REPRO.data;
        } else if (REPRO.mode === MODE.WorkItems && config.isWorkItems) {
          return REPRO.data;
        }
      }
      return this.output;
    }
  };

  /* UTILITIES */

  /**
   * wait is essentially a setTimeout Promise.
   * @usage wait(200).then(() => { doSomething(); });
   * @param {Integer} time (required) is milliseconds of wait.
   * @returns {Promise}
   */
  const wait = time => new Promise((resolve) => setTimeout(resolve, time));

  /**
   * scopeDateFilter supplies URL-compliant parameter for search filter.
   * @returns {String} assumed to be a comma-delineated component of "?filters=" argument.
   */
  const scopeDateFilter = function () {
    let iso,hours = 24 * config.daysOfWorkFlows;
    if (hours > 0) {
      iso = new Date(Date.now()-Math.floor(1000*60*60*hours)).toISOString();
      return `,DateCreated%3E=${iso}`;
    } else {
      return "";
    }
  };

  /**
   * deduceEntityType is a convenience standard for determining entity from expected properties.
   * @param {Object} obj (required) is the data node containing expected properties.
   * @returns {String} the entity type.
   */
  const deduceEntityType = function (obj) {
    if ("ExperimentId" in obj) {
      return "Experiment";
    } else if ("Worker" in obj) {
      return "WorkItem";
    } else if ("ObjectType" in obj) {
      return obj.ObjectType; 
    } else {
      return "Simulation";
    }
  };

  /**
   * isValidGuid determines validity of GUID string.
   * @param {String} candidate (required) is the GUID to test.
   * @returns {Boolean} true when valid.
   */
  const isValidGuid = function (candidate) {
    if (arguments.length > 0) {
      return /[a-fA-F0-9]{8}(?:-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}/.test(candidate);
    } else {
      return false; 
    }
  };

  /**
   * breakCamelCase improves human-legibility of property keys.
   * @param {String} value (required) is the property key to parse.
   * @return {String} the human-legible term.
   */
  const breakCamelCase = function(value) {
    if (/^ExperimentId$/.test(value)) { value = "ExpId"; }
    return !!value ? value.split(/(?=[A-Z])/).join(" ") : "";
  };

  /* EVENT-HANDLERS */

  /**
   * onClick handles view's click interactions.
   * @param {Event}
   */
  const onClick = function(event) {
    if (event.target.nodeName == "A") {
      event.stopPropagation();
      event.stopImmediatePropagation();
    } else if (event.target.nodeName == "DATA") {
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (window.getSelection && document.createRange) {
        let range, selection = window.getSelection();
        if (selection.toString().length < 1) { 
          window.setTimeout(function(){
            range = document.createRange();
            range.selectNodeContents(event.target);
            selection.removeAllRanges();
            selection.addRange(range);
          },1);
        }
      }
    } else {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      let ele = event.target.closest("li[itemid]");
      if (!!ele && !ele.classList.contains("block")) {
        let guid = ele.getAttribute("itemid");
        ele.classList.toggle("active");
        ele.querySelector("dfn.tooltip").removeAttribute("style");
        if (!ele.classList.contains("active")) {
          ele.classList.add("closed");
          wait(500).then(() => ele.classList.remove("closed"));
        }
        if (config.isSimulations && !ele.classList.contains("detailed")) {
          if (isValidGuid(guid)) {
            fetchItemDetail(guid, 2, data => {
              distributeItemDetail(ele, data);
            });
          }
        }
      } else {
        // click-away...
        view.chart.querySelectorAll("li[itemid].active").forEach(tooltip => {
          tooltip.classList.remove("active");
        });
      }
    }
  };

  /**
   * unClick removes the onClick listener.
   * @param {HTMLElement} holder (required) is the element with listener attached.
   */
  const unClick = function(holder) {
    holder.removeEventListener("click", onClick);
  };

  /**
   * onScroll (and global scrolling interval) flags scrolling elements as they scroll.
   * @param {Event} the scroll event.
   */
  let scrolling = 0;
  const onScroll = function (event) {
    if (!scrolling) {
      event.target.classList.add("scrolling");
      event.target.querySelectorAll("li[itemid].active").forEach(tooltip => {
        // TODO: try harder to allow scroll of tooltips!
        tooltip.classList.remove("active");
      })
    } else {
      clearInterval(scrolling);
    }
    scrolling = setInterval(function () {
      event.target.classList.remove("scrolling");
      scrolling = 0;
    }, 500);
  };

  /**
   * unScroll removes the onScroll listener.
   * @param {HTMLElement} holder (required) is the element with listener attached.
   */
  const unScroll = function (holder) {
    holder.removeEventListener("scroll", onScroll);
  };

  /**
   * onMouseEnter is the primary trigger for engagement with charted items.
   * @param {Event} the mouseenter event.
   */
  const onMouseEnter = function (event) {

    let ele = event.target.closest("li[itemid]");

    if (!!ele) {
      event.stopPropagation();
      let guid = ele.getAttribute("itemid");
      let rect = ele.getBoundingClientRect();
      let width = parseInt(ele.querySelector("dfn.tooltip dl").offsetWidth);
      let left = parseInt(rect.left);
      let indent = parseInt(ele.querySelector("li.block").offsetWidth);
      let mleft = Math.max(0, Math.max(event.pageX, (left + indent)) - left - indent - width);
      let mtop = view.chart.scrollTop;
      
      if (!ele.classList.contains("active")) {
        ele.querySelector("dfn.tooltip").style.marginLeft = `${mleft}px`;
      }
      if (!!mtop) {
        ele.querySelector("dfn.tooltip").style.marginTop = `-${mtop}px`;
      }
      
      // @TODO: Verify this is no longer needed...
      // let top = parseInt(ele.closest("output").getBoundingClientRect().top);
      // marginTop: !!ff ? 0 : -top /* FF-specific adjustment (due to scrollTop) */

      if (!ele.classList.contains("detailed")) {
        if (isValidGuid(guid)) {
          fetchItemDetail(guid, 0, data => {
            distributeItemDetail(ele, data);
          });
          fetchItemDetail(guid, 2, data => {
            distributeItemDetail(ele, data);
          });
        }
      }
    }
  };

  /**
   * unMouseEnter removes the onMouseEnter listener.
   * @param {HTMLElement} holder (required) is the element with listener attached.
   */
  const unMouseEnter = function (holder) {
    holder.removeEventListener("mouseenter", onMouseEnter);
  };

  /* VIEW */

  /**
   * render executes all DOM-related mutations.
   * @callback is passed the rendered view's container element.
   */
  const render = function(callback) {

    let owner = config.auth().getUserName();

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
      if (config.isWorkItems) {
        data = data.filter(item => {
          if (!config.activeWorkFlowsOnly) {
            return true;
          } else {
            let thisActive = _.has(item, "State") && _.intersection(_.concat(STATE.PreActive,STATE.Active),[item.State]).length > 0;
            let relatedActive = _.has(item, "Active") && item.Active;
            return thisActive || relatedActive;
          }
        });         
      }
      if (_.isEmpty(data)) {
        let li = document.createElement("LI");
        li.appendChild(document.createTextNode("empty"));
        ol.appendChild(li);
        parent.classList.add("empty");
      } else {
        data.some((item,index) => {

          if (index == config.truncateMin && !view.figure.classList.contains("untruncated")) {
            view.figure.classList.add("truncated");
            return true;
          }
          if (index == config.truncateMax) {
            return true;
          }

          let li = document.createElement("LI");
          let ul = document.createElement("UL");
          let block = document.createElement("LI");
          let more = document.createElement("LI");
          let icon = document.createElement("I");

          icon.classList.add("material-icons");
          icon.setAttribute("title", "Pin/Unpin Details");
          icon.appendChild(document.createTextNode("more_vert"));
          more.appendChild(icon);
          more.classList.add("more");

          block.appendChild(document.createElement("DFN"));
          block.classList.add("block");
          block.style.width = `${item.ViewSize}%`;

          doc.appendChild(li);
          li.appendChild(ul);
          ul.appendChild(block);
          ul.appendChild(more);

          if ("Owner" in item && !!owner && item.Owner === owner) {
            ul.classList.add("owner");
          }
          if (_.has(item, "SimulationStateCount")) {
            li.setAttribute("itemid", item["ExperimentId"]);
            setQueueItemDetails(block, item);
            setQueueItemSegments(ul, item);
          } else if (_.has(item, "Flow")) {
            li.setAttribute("itemid", item["Id"]);
            setQueueItemDetails(block, item);
            setQueueItemFlow(ul, item.Flow);
          } else {
            li.setAttribute("itemid", "orphan");
            collection.augment(item, {"SimulationStateCount":{"Orphan":1}}, true);
            setQueueItemDetails(block, item);
            setQueueItemSegments(ul, item);
          }
        });
        ol.appendChild(doc);
      }
    };
    const setQueueItemSegments = function (fragment, item) {
      let info = item["SimulationStateCount"];
      let tip = document.createElement("INS");
      tip.appendChild(document.createElement("B"));
      tip.classList.add("arrow");
      if (!info) return;
      ["PreActive","Active","PostActive"].forEach(stage => {
        STATE[stage].forEach(status => {
          if (status in info) {
            let a = document.createElement("A");
            let li = document.createElement("LI");
            let val = document.createElement("VAR");
            li.setAttribute("title", status);
            li.classList.add(status);
            li.style.flexGrow = info[status];
            if (stage == "Active") {
              li.classList.add("process"); /* @TODO: consider the stage as className */
            }
            if (/Orphan/.test(status)) {
              a.setAttribute("href",`/#explore/Simulations?filters=Owner=${item.Owner}&offset=0`);
              a.setAttribute("title", `Explore ${item.Owner}'s Simulations`);
            } else {
              a.setAttribute("href",`/#explore/Simulations?filters=ExperimentId=${item.ExperimentId},SimulationState=${status}&offset=0`);
              a.setAttribute("title", info[status] > 1 ? `Explore These ${status} Simulations` : `Explore This ${status} Simulation`);
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
            li.addEventListener("mouseenter", onMouseEnter);
          }
        });
      });
      fragment.querySelector("li:last-of-type").appendChild(tip);
    };
    const setQueueItemFlow = function (fragment, info) {
      let id = info["Ancestors"][0].Id;
      _.concat(info["Ancestors"],info["Related"])
      .filter(item => item["ObjectType"] != "AssetCollection")
      .forEach(member => {
        let a = document.createElement("A");
        let li = document.createElement("LI");
        let val = document.createElement("VAR");
        let tip = document.createElement("INS");
        let type = member.ObjectType || "WorkItem";
        if (/^Experiment$/i.test(type)) {
          if ("SimulationStateCount" in member) {
            setQueueItemSegments(fragment, member);
          } else {
            fetchItemDetail(id, 1,function(){
              setQueueItemSegments(fragment, member);
            });
          }
          fragment.querySelector("li:last-of-type").style.marginRight = "22px";
        } else {
          tip.appendChild(document.createElement("B"));
          tip.classList.add("arrow");
          val.appendChild(document.createTextNode("Worker" in member ? member.Worker.Name : type));
          a.appendChild(val);
          a.setAttribute("href",`/#explore/WorkItems?filters=Id=${id}&related=true&offset=0`);
          a.setAttribute("title", `Explore This Workflow`);
          li.appendChild(a);
          li.appendChild(tip);
          li.setAttribute("title", member.Name);
          li.classList.add(member["State"]||member["SimulationState"]||"DefaultState", type);
          if (_.intersection(STATE.Active,li.classList.value.split(" ")).length > 0) {
            li.classList.add("process");
          }
          li.style.flexGrow = /work/i.test(type) ? 1 : 10;
          li.style.marginRight = "22px";
          fragment.appendChild(li);
          li.addEventListener("mouseenter", onMouseEnter);
        }
      });
      fragment.querySelector("li:last-of-type").style.marginRight = "0";
    };
    const setQueueItemDetails = function (fragment, info) {
      /* TODO: coalesce/call appendTooltip(); */
      let implement = function (key, index, arr, obj) {
        let dd = document.createElement("DD");
        let name = document.createElement("VAR");
        let value = document.createElement("DATA");
        if (key === Object(key)) {
          for (let k in key) { implement(k,index,arr,key); }
        } else if (/^-$/.test(key)) {
          let divider = document.createElement("HR");
          dd.appendChild(divider);
          dl.appendChild(dd);
        } else {
          name.appendChild(document.createTextNode(breakCamelCase(key)));
          value.appendChild(document.createTextNode(!!obj?obj[key]:info[key]));
          dd.setAttribute("itemprop", key);
          dd.appendChild(name);
          dd.appendChild(value);
          dl.appendChild(dd);
        }
      };
      let dfn = fragment.querySelector("DFN");
      let dl = document.createElement("DL");
      let dt = document.createElement("DT");
      let a = document.createElement("A");
      
      dt.appendChild(a);
      dl.appendChild(dt);
      dl.setAttribute("title", "pin/unpin this info");

      if (_.has(info, "ExperimentId")) {
        a.appendChild(document.createTextNode("Experiment"));
        a.setAttribute("href",`/#explore/Simulations?filters=ExperimentId=${info.ExperimentId}&offset=0`);
        a.setAttribute("title", "Explore This Experiment");
        [
          "Owner","ExperimentId","NodeGroup","Elapsed","SimulationCount",
          "-",{"Runtime":"Stats as work completes..."},
          "-",{"Utilization":"Details when available..."}
        ].forEach(implement);
      } else if (_.has(info, "Flow")) {
        a.appendChild(document.createTextNode(info["Name"]||"Workflow"));
        a.setAttribute("href",`/#explore/WorkItems?filters=Id=${info.Id}&related=true&offset=0`);
        a.setAttribute("title", `Explore This Workflow`);
        ["Owner","Id","EnvironmentName","Elapsed","RelatedCount"].forEach(implement);
        if (_.has(info.Flow, "Related") && info.Flow.Related.length > 0) {
          info.Flow.Related.forEach(relation => {
            implement("-",0,[],relation);
            implement("ObjectType",0,[],relation);
            if (_.has(relation, "Worker.Name")) {
              implement("Worker",0,[],{"Worker":_.get(relation, "Worker.Name")});
            }
            implement("Id",0,[],relation);
          });
        }
      } else {
        a.appendChild(document.createTextNode("Orphan Simulation"));
        a.setAttribute("href",`/#explore/Simulations?filters=Owner=${info.Owner}&offset=0`);
        a.setAttribute("title", `Explore ${info.Owner}'s Simulations`);
        ["Owner","NodeGroup","Elapsed"].forEach(implement);
      }
      dfn.classList.add("tooltip");
      dfn.appendChild(dl);
      appendPin(dl);
    };
        
    wait(0)
    .then(() => destroy())
    .then(() => {
      view.parent = document.querySelector(config.selector);
      view.chart = view.parent.querySelector(config.chartContainer);
      view.chart.addEventListener("scroll", onScroll);
      view.chart.addEventListener("click", onClick);
      view.figure.classList.add("process");
      view.figure.classList.remove("truncated");
    })
    .then(() => {
      for (let item in PRIORITY) {
        let bucket = setQueueBucket(view.chart, PRIORITY[item].name);
        setQueueItems(bucket, PRIORITY[item].key);
      }
    })
    .finally(() => {
      addSourceSelect();
      addStateLegend();
      addTruncateToggle();
      updateTruncateToggle();
      if (!!callback && callback instanceof Function) {
        callback(view.parent);
      }
      if (config.debugging) {
        console.log(config.chartContainer, "Rendered data:", JSON.stringify(collection.latest));
      }
    });
    
    wait(400)
    .then(() => {
      view.figure.classList.remove("process");
    });
  };

  /**
   * appendPin does standard attachment of the "pin" indicator icon.
   * @param {HTMLElement} ele (required) is assumed to be the tooltip's DL element.
    */
  const appendPin = function (ele) {
    let on, off, control = ele.querySelector("hr");
    if (control) {
      control = control.closest("dd");
      if (control && !control.querySelector("i.material-icons")) {
        on = document.createElement("I");
        off = document.createElement("I");
        on.classList.add("material-icons", "on");
        off.classList.add("material-icons", "off");
        on.appendChild(document.createTextNode("location_on"));
        off.appendChild(document.createTextNode("location_off"));
        control.appendChild(on);
        control.appendChild(off);
        control.classList.add("control");
      }
    }
  };

  /**
   * appendTooltip applies secondary Response data to pre-built tooltip.
   * NOTE: A hyphen "-" passed as key will embed an <hr> divider.
   * NOTE: Unfound keys are passed-over and will not be appended.
   * NOTE: Previous content of the same key will update, not append.
   * 
   * @param {DOMElement} ele is the tooltip element (e/g dfn.tooltip).
   * @param {Array} keys are the properties to be found in the info.
   */
  const appendTooltip = function (ele, info, keys) {
    let dl = ele.querySelector("DL");
    let implement = function (key, index, source) {
      let val = 0;
      let dd = document.createElement("DD");
      let name = document.createElement("VAR");
      let value = document.createElement("DATA");
      if (/^-$/.test(key)) {
        let divider = document.createElement("HR");
        dd.appendChild(divider);
        dl.appendChild(dd);
      } else if (key in info) {
        name.appendChild(document.createTextNode(breakCamelCase(key)));
        if (/^(Min|Median|Max|TotalCoreTimeUsage)$/i.test(key)) {
          val = parseInt(info[key]);
          val = val < 1000*60*60 ? (val/1000/60).toFixed(2) + " mins" : (val/1000/60/60).toFixed(2) + " hrs"
        } else if (/TotalDiskUsage/i.test(key)) {
          val = parseInt(info[key]);
          val = (Math.round(val / 10485.76) / 100).toFixed(2).toLocaleString() + " MiB";
        } else {
          val = info[key];
        }
        value.appendChild(document.createTextNode(val));
        dd.setAttribute("itemprop", key);
        dd.appendChild(name);
        dd.appendChild(value);
        if (/^(Min|Median|Max|MaxCores|MinCores|TotalCoreTimeUsage|TotalDiskUsage)$/.test(key)) {
          // we are inserting secondary info mid-tooltip...
          let reference,referenceNode,placeholder = false;
          if (index < 1) {
            reference = key == "Min" ? "Runtime" : "Utilization";
            placeholder = true;
          } else {
            reference = source[index-1];
          }
          referenceNode = dl.querySelector(`[itemprop=${reference}]`);
          if (!!referenceNode && referenceNode.parentNode && !referenceNode.classList.contains("ignore")) {
            if (dl.querySelector(`[itemprop=${key}] data`)) {
              dl.querySelector(`[itemprop=${key}] data`).innerText = val;
            } else {
              referenceNode.parentNode.insertBefore(dd, referenceNode.nextSibling);
            }
            if (placeholder) {
              referenceNode.classList.add("ignore");
            }
          } else {
            if (dl.querySelector(`[itemprop=${key}] data`)) {
              // this key was previously rendered, so update it...
              dl.querySelector(`[itemprop=${key}] data`).innerText = val;
            } else {
              dl.appendChild(dd);
            }
          }
        } else {
          dl.appendChild(dd);
        }
      }
    };
    keys.forEach(implement);
  };

  /**
   * recoup recovers gracefully from data access failure (unused).
   * @TODO
   */
  const recoup = function () {

  };

  /**
   * destroy removes view and resets caches
   * @param {Boolean} reset, when true will initialize data collection too.
   */
  const destroy = function (reset) {
    if (!!view.chart) {
      unClick(view.chart);
      unScroll(view.chart);
      while (view.chart.firstChild) {
        view.chart.removeChild(view.chart.firstChild);
      }
      view.chart = null;
    }
    if (!!reset) {
      collection.reset();
      view.figure.classList.remove("truncated", "untruncated");
    }
  };

  /* WORKFLOWS */

  /**
   * fetchTally is the companion store for tallyFetch();
   * @property {Array} fetchMethods tuple of [Requests,Responses].
   * @property {Function} reset will zero-out this store to defaults.
   * @property {Function} complete deduces when all Requests have corresponding Response (as finally).
   * @property {Function} print logs the current status of fetchMethods
   */
  let fetchTally = {
    fetchWorkItems: [0,0],
    fetchWorkFlow: [0,0],
    fetchWorkFlowItems: [0,0],
    fetchItemDetail: [0,0],
    reset: function() {
      for (let name in this) {
        if (Array.isArray(this[name])) {
          this[name] = [0,0];
        }
      }
    },
    complete: function() {
      let result = "";
      for (let name in this) {
        if (Array.isArray(this[name])) {
          result += this[name][0]+this[name][1];
        }
      }
      return result === "0000";
    },
    print: function() {
      console.log("queue.fetchTally:",this.fetchWorkItems.join("|"),this.fetchWorkFlow.join("|"),this.fetchWorkFlowItems.join("|"),this.fetchItemDetail.join("|"));
    }
  };

  /**
   * tallyFetch accounts for matching every Request to every Response.
   * @param {String} method is the fetch sending Requests and expecting Responses. 
   * @param {Integer} tally, when positive is a Request, when negative is a Response (a finally).
   */
  const tallyFetch = function (method, tally) {
    let count = /^-?\d+$/.test(tally) ? parseInt(tally) : 0;
    if (!!method && method in fetchTally) {
      if (count > 0) {
        if (method == "fetchWorkItems") { fetchTally.reset(); }
        fetchTally[method][0] += count;
      } else if (count < 0) {
        fetchTally[method][1] += count;
      }
    }
    // fetchTally.print();
    if (fetchTally.complete()) {
      // console.error("Rendering!");
      // Multiple fetchItemDetail's could be virtually concurrent. 
      // Result could be first-to-resolved beating last-to-request.
      // For these scenarios, supply 200ms to cover potential disparity. 
      // This should be sufficient allowance without being evident. 
      // Note: Disparity is only the difference in latency of concurrent calls.
      wait(200).then(() => render());
    }
  };

  /**
   * fetchWorkItems is initial call to get TopLevel items within the scope of concern.
   * @param successCallback
   * @param failureCallback
   */
  const fetchWorkItems = function (successCallback, failureCallback)  {
    let scope = scopeDateFilter();
    let count = 0;
    let url = config.isMocked ? config.mockURL + "WorkItems.json"
        : `${config.endpoint}WorkItems?filters=isTopLevel=1,State!=Created,State!=Canceled,State!=Succeeded,State!=Failed${scope}&orderby=DateCreated%20desc&format=json`;
    tallyFetch("fetchWorkItems",1);
    getSecure(url)
    .then(data => {
      /* @TODO: QUALIFY WORKFLOWS BY PRIORITY! */
      if (_.has(data, "WorkItems")) {
        collection.update({ "Normal": data.WorkItems });
        tallyFetch("fetchWorkFlow", data.WorkItems.length);
        fetchWorkFlow(0);
      }
      if (successCallback && successCallback instanceof Function) {
        successCallback();
      }
    })
    .catch(function (error) {
      if (failureCallback && failureCallback instanceof Function) {
        failureCallback(error);
      } else {
        console.error("queueView.fetchWorkItems", error);
      }
    })
    .finally(function () {
      // console.log("Fetched ALL Work Items!");
      tallyFetch("fetchWorkItems",-1);
    });
  };

  /**
   * fetchWorkFlow is an iterative call upon every item in the Response of fetchWorkItems();
   * @param {Integer} cursor is the position within the TopLevel items within the scope of concern.
   */
  const fetchWorkFlow = function (cursor) {
    let item, guid, asAncestor, url, count = 0;
    let source = collection.latest.Normal;
    if (-1 < cursor && cursor < source.length) {
      item = source[cursor];
      guid = _.get(item, "Id");
      if (!!item && !!guid) {
        asAncestor = Object.assign({ Relationship:"Ancestor" }, _.clone(item));
        url = config.isMocked ? config.mockURL + "Related.json" : `${config.endpoint}WorkItems/${guid}/Related?format=json`;
        getSecure(url)
        .then(data => {
          if (_.has(data, "Related")) {
            // Mocked data can be a collection, 
            // so make the singular API Response the same.
            data = [data];
          }
          data.filter(info => info.Id == item.Id).forEach(node => {
            
            if (_.has(node, "Related") && node.Related.length > 0) {
              node["Ancestors"].unshift(asAncestor);
              count = node["Related"].filter(item => /Simulation|Experiment|WorkItem/i.test(_.get(item, "ObjectType"))).length;
              collection.augment(item,{ Flow: _.clone(node), RelatedCount: count }, true);
              tallyFetch("fetchWorkFlowItems", count);
              fetchWorkFlowItems(item, 0);
            
            } else {
              // this is a singular Work Item.
              collection.augment(item,{ Flow: { Ancestors: [ asAncestor ], Related: [] }, RelatedCount: 0 }, true);
            }
          })
        })
        .catch(function (error) {
          console.error("queueView.fetchWorkFlow", error);
        })
        .finally(function () {
          fetchWorkFlow(cursor+1); // goto next
          tallyFetch("fetchWorkFlow", -1);
        });
      } else {
        fetchWorkFlow(cursor+1); // goto next
      }

    } else {
      // finish or continue
      // console.log("Fetched ALL Related!");
    }
  };

  /**
   * fetchWorkFlowItems is an iterative call upon every item in the Response of fetchWorkFlow();
   * @param {Object} item is the Collection node to be augmented.
   * @param {Integer} cursor is the position within the target node's collection of "Related" items.
   */
  const fetchWorkFlowItems = function (item, cursor) {
    let relation, entity, guid, url, index, node;
    let flow = _.get(item, "Flow");
    if (!!flow && "Related" in flow && -1 < cursor && cursor < flow["Related"].length) {
      relation = flow["Related"][cursor];
      entity = _.get(relation, "ObjectType");
      guid = _.get(relation, "Id");
      if (!!entity && !!guid && /Simulation|Experiment|WorkItem/i.test(entity)) {
        url = config.isMocked ? config.mockURL + `Entities.json` : `${config.endpoint}${entity}s/${guid}?format=json`;
        getSecure(url)
        .then(data => {
          index = data[`${entity}s`].findIndex(item => { return item.Id == guid });
          node = data[`${entity}s`][index];
          collection.augment(relation, node);
          if (/Experiment/i.test(entity)) {
            tallyFetch("fetchItemDetail", 1);
            fetchItemDetail(guid, 1, info => {
              item["Active"] = _.has(info, "SimulationStateCount") && _.intersection(_.concat(STATE.PreActive,STATE.Active),Object.keys(info["SimulationStateCount"])).length > 0;
              tallyFetch("fetchItemDetail", -1);
            });
          } else {
            if (_.intersection(_.concat(STATE.PreActive,STATE.Active),[node["State"],node["SimulationState"]]).length > 0) {
              item["Active"] = true;
            }
          }
        })
        .catch(function (error) {
          console.error("queueView.fetchWorkFlowItems", error);
        })
        .finally(function () {
          fetchWorkFlowItems(item,cursor+1); // goto next
          tallyFetch("fetchWorkFlowItems", -1);
        });
      } else {
        fetchWorkFlowItems(item,cursor+1);
      }
    }
  };

  /**
   * fetchItemDetail is a secondary call upon interaction with chart items. 
   * @TODO Multiple workflows could contain the same Experiment so multiple detail calls could be avoided. 
   * @param {String} guid is the item of interest which has been interacted with (e/g MouseEnter).
   * @param {Integer} depth of 0|null is entity only, 1 is basic detail (e/g counts), 2 is deep (e/g simulationruntime).
   * @param {Function} callback returns the data (pointer) to the collection item (or null if not found).
   */
  const fetchItemDetail = function (guid, depth, callback) {
    let items, item = collection.findItemById(guid);
    if (!!item) {
      let entity = deduceEntityType(item);
      if (entity === "Experiment") {
        let params = !depth ? "" : depth == 1 ? "&statsoperations=simulationcount,simulationstatecount,simulationusage" : "&statsoperations=simulationruntime";
        let url = config.isMocked ? config.mockURL + `Stats.json` : `${config.endpoint}${entity}s?Id=${guid}${params}&format=json`;
        getSecure(url)
        .then(data => {
          items = collection.findItemsById(guid);
          if (_.has(data, "Experiments") && Array.isArray(data.Experiments)) {
            items.forEach(instance => {
              collection.augment(instance, data.Experiments.filter(exp => exp.Id === guid)[0]||{});
            });
          }
          if (_.has(data, ["Stats", guid])) {
            items.forEach(instance => {
              collection.augment(instance, data["Stats"][guid]);
            });
          }
        })
        .catch(function (error) {
          console.error("queueView.fetchItemDetail", error);
        })
        .finally(function () {
          if (!!callback && callback instanceof Function) {
            callback(item);
          }
        });
      } else {
        // not an Experiment (other entities not currently supported)
        if (!!callback && callback instanceof Function) {
          callback(item);
        }
      }
    } else {
      // not found in Collection (unlikely)
      if (!!callback && callback instanceof Function) {
        callback(null);
      }
    }
  };

  /**
   * distributeItemDetail diverts resolution of secondary call to proper rendering.
   * @param {HTMLElement} ele is assumed to be the charted queue item's LI[itemid] element.
   * @param {Object} data is the salient data node (Response) for render.
   */
  const distributeItemDetail = function (ele, data) {
    if (!!data) {
      if ("Name" in data) {
        ele.querySelector("dt a").innerText = data.Name;
      }
      if ("SimulationRuntime" in data) {
        appendTooltip(ele, data["SimulationRuntime"], ["Min", "Median", "Max"]);
      }
      if ("SimulationUsage" in data) {
        appendTooltip(ele, data["SimulationUsage"], ["MaxCores", "MinCores", "TotalCoreTimeUsage", "TotalDiskUsage"]);
      }
    }
    ele.classList.add("detailed");
  };

  /**
   * getSecure is a convenience stub to standardize REST header and Response parse.
   * @param {String} url
   * @return {Promise}
   */
  const getSecure = function(url) {
    return fetch(url, {
      method: "GET",
      cache: "no-cache",
      headers: {
        "X-COMPS-Token": config.token
      }
    }).then(response => response.json());
  };

  /**
   * postSecure is a convenience stub to standardize REST header and Response parse.
   * @param {String} url
   * @return {Promise}
   */
  const postSecure = function(url, payload={}) {
    return fetch(url, {
      method: "GET",
      cache: "no-cache",
      headers: {
        "X-COMPS-Token": config.token
      },
      body: JSON.stringify(payload)
    }).then(response => response.json());
  };

  /* MOCK SIMULATIONS */

  /**
   * fetchMockSimulations is the alternative routine for getting local mocked data.
   * @callback successCallback
   * @callback failureCallback
   */
  const fetchMockSimulations = function (successCallback, failureCallback)  {
    let primary = config.mockURL + "Queue.json";
    let secondary = config.mockURL + "Stats.json";
    fetch(primary, { method:"GET" })
    .then(response => response.json())
    .then(data => collection.update(data.QueueState))
    .then(response => fetch(secondary, { method:"GET" }))
    .then(response => response.json())
    .then(data => { collection.merge(data.Stats); return collection.latest; })
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
        console.error("queueView.fetchMockSimulations", error);
      }
    })
    .finally(function () {
      // console.log("Fetched Mock Simulation Data:", primary, secondary);
    });
  };

  /**
   * addTruncateToggle standardizes appending of truncation-related DOM elements.
   */
  const addTruncateToggle = function() {

    if (view.figure.querySelector("ins.truncation")) {
      return;
    }

    const target = view.figure;
    const toggle = document.createElement("INS");
    [{
      control:"disable",
      content: `Only the top ${config.truncateMin} of each priority are being shown (there are <var>#</var> total). Click to show more.`
    }, {
      control:"enable",
      content: `As many as ${config.truncateMax} of each priority are being shown (there are <var>#</var> total). Click to show fewer.`

    }].forEach(opt => {
      let span = document.createElement("SPAN");
      span.classList.add(opt.control);
      span.innerHTML = opt.content;
      toggle.appendChild(span);
    });

    toggle.classList.add("truncation");
    target.appendChild(toggle);

    toggle.addEventListener("click", function(event) {
      event.stopPropagation();
      let isTruncated = view.figure.classList.contains("truncated");
      view.figure.classList.toggle("truncated", !isTruncated);
      view.figure.classList.toggle("untruncated", isTruncated);
      render();
    });
  };

  /**
   * updateTruncateToggle applies current collection count to truncation toggle.
   */
  const updateTruncateToggle = function() {
    if (!view.figure.querySelector("ins.truncation")) {
      addTruncateToggle();
    }
    view.figure.querySelectorAll("ins.truncation var").forEach(toggle => {
      toggle.innerText = collection.count;
    });
    let most = 0;
    let buckets = view.chart.querySelectorAll(".queue-bucket");
    buckets.forEach(bucket => most = Math.max(most, bucket.querySelectorAll("li[itemid]").length));
    if (most <= config.truncateMin) {
      view.figure.classList.remove("untruncated");
    }
  };

  /**
   * addStateLegend standardizes appending of legend of queue states.
   */
  const addStateLegend = function () {

    const target = view.parent.querySelector("figcaption legend");
    if (!target || target.querySelector("span")) {
      return;
    }
    
    const states = _.union(STATE.PreActive,STATE.Active,STATE.PostActive,["Yours"]).map(state => {
      if (/orphan/i.test(state)) {
        return { text: "Orphaned", title: "Simulations\nwithout an\nExperiment" };
      } else if (/creat|commiss|provis|valid/i.test(state)) {
        return { text: "Commissioning", title: state };
      } else if (/cancel/i.test(state)) {
        return { text: "Canceling", title: state };
      } else if (/resume|retry/i.test(state)) {
        return { text: "Resuming", title: state };
      } else {
        return { text: state, title: state };
      }
    }).reverse();
        
    states.forEach(state => {
      let text = state.text;
      let title = state.title;
      let span, prior = target.querySelector(`span.${text}`);
      if (!!prior) {
        title = prior.getAttribute("title") + "\n" + title;
        prior.setAttribute("title", title);
      } else {
        span = document.createElement("SPAN");
        span.classList.add(text);
        span.setAttribute("title", title);
        span.appendChild(document.createTextNode(text));
        target.prepend(span);
      }
    });
  };

  /**
   * addSourceSelect standardizes the appending of select-option input for source select.
   * sourceSelectTrigger is the dispatchEvent for triggering this change event remotely.
   */
  let sourceSelectTrigger;
  const addSourceSelect = function() {

    const target = view.parent.querySelector("figcaption legend");
    if (!target || target.querySelector("figcaption legend select")) {
      return;
    }

    /* @TODO abstract and externalize. */
    const options = config.isSimulations ? 
      [
        { name:"API Simulations", value: 0, selected: true },
        { name:"MOCK Simulations 1", value: "Simulations/1/" },
        { name:"MOCK Simulations 2", value: "Simulations/2/" },
        { name:"MOCK Simulations 3", value: "Simulations/3/" },
        { name:"MOCK Simulations 4", value: "Simulations/4/" },
        { name:"", value: "", disabled: true }
      ] 
        :
      [
        { name:"API Work Items", value: 0, selected: true },
        { name:"MOCK Work Items 1", value: "WorkItems/1/" },
        { name:"MOCK Work Items 2", value: "WorkItems/2/" },
        { name:"MOCK Work Items 3", value: "WorkItems/3/" },
        { name:"MOCK Work Items 4", value: "WorkItems/4/" },
        { name:"", value: "", disabled: true }
      ];
    let fragment = document.createDocumentFragment();
    let input = fragment.appendChild(document.createElement("SELECT"));
    let apis = input.appendChild(document.createElement("OPTGROUP"));
    let mock = input.appendChild(document.createElement("OPTGROUP"));
    options.forEach((item,index) => {
      let group = /^\d$/.test(item.value) ? apis : mock;
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
      view.figure.classList.add("process");
      if (!/^[0-9]$/.test(event.target.value)) {
        config.mocked = true;
        destroy(true);
        config.modeEntity = (new RegExp(MODE.Simulations)).test(event.target.value) ? MODE.Simulations : MODE.WorkItems;
        config.mockChoice = event.target.value;
        if (config.isSimulations) {
          fetchMockSimulations(render, recoup);
        } else {
          fetchWorkItems();
        }
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
      }
    });
  };

  return {
    
    draw: function(overrides, callback) {
      /**
       * draw is the backwards-compatible interface called from dashboard/view.
       * @public called upon initial render and subsequent refresh (click).
       * @param {Object} overrides (optional) modification since instantiation.
       * @param {Function} callback (optional) code to execute upon render (at dashboard/view).
       * @return null;
       */
      
      config.recycleToken();

      if (config.isMocked) {
        if (!!view.chart) {
          collection.advance();
          destroy();
          render();
          return;
        } else {
          if (config.isSimulations) {
            fetchMockSimulations(render, recoup);
          } else {
            fetchWorkItems();
          }
        }
      } else {
        
        if (config.isSimulations) {

          // Sim Queue originates at module, which maintains Auth
          Object.assign(config, (overrides || {}));
          destroy(true); // TODO: Only if need be.
          collection.update(config.queue);
          collection.merge(config.stats);
          render(callback);
          
        } else {
          
          const doWorkItems = function() {
            fetchWorkItems(
            () => {
              /* successCallback */
              view.figure.classList.remove("process");
            },
            () => {
              /* successCallback */
              view.figure.classList.remove("process");
            });
            if (!!callback && callback instanceof Function) {
              callback();
            }
          };
          if (config.auth().tokenIsWaning()) {
            config.auth().refreshCredentials(
                null, 
                doWorkItems,
                function(statusText, xhr) {
                if (_.has(window, "comps.notifier")) {
                  _.invoke(window, "comps.notifier.notify", statusText, { level: "error" });
                } else { 
                  alert(statusText);
                }
              }
            );
          } else {
            doWorkItems();
          }
        }
      }
    },

    redraw: function(overrides) {
      /** @deprecated legacy method, unused. */
      console.log("redraw!", overrides);
    },

    getView: function() {
      /** @returns {Object} accessor for DOM elements associated with the Queue chart. */
      return view;
    },

    getCollection: function() {
      /** @returns {Collection} the current Array of Objects currently within Queue. */
      return collection.latest;
    },
    
    getCollectionCount: function() {
      /** @returns {Integer} the number of items currently within Queue. */
      return collection.count;
    },

    getConfig: function() {
      /** @returns {Object} the current configuration settings. */
      return config;
    },

    getMode: function() {
      /** @returns {String} "Simulations" or "WorkItems". */
      return config.mode;
    },

    setScoreSize: function(value) {
      /** @param {Integer} value (required) is scaling range within 0-100% (default is 24). */
      if (/^[1-9][0-9]$|[1-9]$/.test(value)) {
        config.scoreSize = parseInt(value);
        destroy(true);
        if (config.isMocked) {
          fetchMockSimulations(() => { render(); });
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
      /** @returns {Boolean} true when data currently shown is mocked, otherwise API (not mock). */
      return config.isMocked;
    },
    
    toggleMockSelect: function(force) {
      /** @param {Boolean} force when true|false shows|hides data-source select-option. Otherwise toggle. */
      let mockable = arguments.length > 0 ? !!force : !view.parent.classList.contains("mockable");
      view.parent.classList.toggle("mockable", mockable);
      if (!mockable && config.isMocked) {
        config.mocked = false;
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
      }
    },
    
    setMock: function(index) {
      /** @param {Integer} index is the numbered mock to select. 0 (default) is API, not mock. */
      let select = view.figure.querySelector("select");
      let count = Array.prototype.filter.call(select.options, opt => /^0$|[a-zA-z]+/.test(opt.value)).length; 
      if (sourceSelectTrigger === undefined) {
        sourceSelectTrigger = document.createEvent("HTMLEvents");
        sourceSelectTrigger.initEvent("change", false, true);
      }
      select.selectedIndex = /^\d+$/.test(index) ? Math.max(0, Math.min(count-1, parseInt(index))) : 1;
      select.dispatchEvent(sourceSelectTrigger);
      console.log(`The Queue chart has been set to option ${select.selectedIndex} of the possible values, 0-${count-1}.`);
    },

    setWorkFlowsFilter: function(boo) {
      /** @param {Boolean} true (default) shows only active workflows, false shows all within scope (@see setWorkFlowsScope). */
      if (config.isWorkItems) {
        config.workFlowsActive = /1|true/i.test(boo) ? true : false;
        let message = config.activeWorkFlowsOnly ? "ONLY ACTIVE" : "ALL";
        console.log(`The Workflow Queue will now show ${message} items found within scope!`);
      } else {
        console.warn("Workflow filter only applies to a Queue chart displaying Work Items!");
      }
    },

    setWorkFlowsScope: function(days) {
      /** @param {Number} days before now from which to limit search of Top-Level Work Items. 0 (default) searches all. */ 
      if (config.isWorkItems) {
        config.workFlowScope = days;
        let message = 1 >= config.daysOfWorkFlows ? " day!" : " days!";
        console.log(`The Workflow Queue will now show items within the past ${config.daysOfWorkFlows+message}`);
      } else {
        console.warn("Workflow scope only applies to a Queue chart displaying Work Items!");
      }
    },

    initialized: function () {
      /** @returns {Boolean} true when initialized with data, false when not. */
      return !!Object.keys(collection.latest).length;
    }, 
    
    render: render,
    
    toggleDebug: function(force) {
      /** @param {Boolean} force, when true will spill verbose logging to console. */
      config.logging = force !== undefined ? !!force : !config.debugging;
      if (config.debugging) {
        console.warn(config.chartContainer, "Verbose logging enabled!");
        console.log(config.chartContainer, "Last Rendered data:", JSON.stringify(collection.latest));
      } else {
        console.log(config.chartContainer, "Verbose logging disabled.");
      }
    }, 
    
    toggleRepro: function(queue) {
      /** @param {String} queue (optional) is the entity type of queue's charted items. **/
      REPRO.toggle(config.isWorkItems ? MODE.WorkItems : MODE.Simulations);
      render();
    }
  }
};

export default QueueView;