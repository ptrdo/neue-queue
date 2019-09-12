###### This is released software. Please **[log issues](/issues)** found.
# Dashboard
A Means for Visualizing Progress of Work Processing on High Performance Computing (HPC) Cluster as Implemented by the Institute for Disease Modeling's **Computational Modeling Platform Service** (COMPS)

This JavaScript module, [queueView.js](/queueView.js), should allow a web client to facilitate access to data available from the [COMPS API](https://comps.idmod.org/api/metadata) via conventional Representational State Transfer (REST) protocol, also known as [RESTful web services](https://en.wikipedia.org/wiki/Representational_state_transfer).

This is the same code implemented in the COMPS Web Client. Included within this repository is the required JavaScript, interface template (HTML), and styling (CSS). A simple demonstration is provided (see [the demo](/demo)). An illustration of this design: 

![The released design.](demo/illustration.png)

### Gist 

This is a chart which illustrates the progress of running processes. Each "arrow" represents either an Experiment of Simulations (when in "Simulations" mode) or a Workflow of Related items (when in "WorkItems" mode). The arrows are grouped into "buckets" of relative priority, and then stacked from top-to-bottom according to the time they entered the queue (earliest-to-queue is on top for Simulations, and latest-to-queue is on top for Workflows).

Work runs through a variety of "states" which are represented with colors. 

1. **Pre-Active** states include Created, QueuedForCommission, CommissionRequested, Commissioned, Provisioning, and Validating.
2. **Active** states are denoted with animated striping and include Running, Waiting, QueuedForResume, ResumeRequested, Resumed, and Retry.
3. **Post-Active** (or *terminal*) states include CancelRequested, Canceling, Canceled, Failed, and Succeeded.

When all of the components of an Experiment or Workflow have reached a terminal state, that arrow loses relevance in the queue and is dropped from the API Response data and therefore the chart. An exception to this is the option to show all Workflows of a certain scope regardless of state (see `workFlowScope` and `workFlowsActive` in [Configuration Options](#configuration-options) below).

Ultimately, this chart should inform decisions about where, when, and how to submit work to the system, then validate that submitted work is indeed running, and then illustrate its progress, failure, or success. 

### Basic Usage
**1:** In an HTML document, simply attach [the CSS](demo/build/css/idm-dashboard.css) and provide for an expected page structure (the code leverages this structure to append other elements at runtime):
```html
<head>
  <link rel="stylesheet" href="path/to/idm-dashboard.css">
</head>
<body>
  <div itemid="myQueueView" class="chart queue fullwidth">
    <form class="arrow">
      <figure class="process">
        <figcaption>
          <dl>
            <dt>
              <label><span>The Title of My Chart</span></label>
            </dt>
            <dd>The Description of My Chart</dd>
          </dl>
          <legend>
            <button class="refresh" title="Get Latest">
              <i class="material-icons">refresh</i>
            </button>
          </legend>
        </figcaption>
        <output title="The Title of My Chart" id="myQueueView">
          <!-- CHART RENDERS HERE -->
        </output>
      </figure>
    </form>
  </div>
</body>
```
**2:** The JavaScript component of this code expects to be imported into an ES6-compliant application and then instatiated with configuration options which describe the page environment to the code: 
```javascript
import Queue from "path/to/queueView.js";

// instantiate the chart...
const queue = new Queue({
  selector: "[itemid=myQueueView]", /* root of entire assembly */
  chartContainer:"#myQueueView"
});

// render or refresh the chart...
queue.draw();
```

**3:** By default, the QueueView chart is configured to chart the Simulations of an Experiment executing in a COMPS environment. However, the data which supplies this mode of the QueueView chart are expected to be supplied by routines external to this code. This data is assumed to be the normal Response of the two COMPS API calls, [/api/Metrics/Queue](https://comps.idmod.org/api/json/metadata?op=MetricsQueueGetRequest) and [/api/Experiments/Stats](https://comps.idmod.org/api/json/metadata?op=ExperimentGetStatsRequest), and can be delivered via the instantiating configuration options or the option object parameter of the draw method. So, as an alternative to the above: 
```javascript
import Queue from "path/to/queueView.js";

// instantiate the chart (with data)...
const queue = new Queue({
  selector: "[itemid=myQueueView]",
  chartContainer:"#myQueueView",
  modeEntity: "Simulations",
  queue: {QueueState:{Lowest:[{ExperimentId:"00000000-0000-0000-0000-000000000000"}]}},
  stats: {Stats:{"00000000-0000-0000-0000-000000000000":{Property:"foo"}}}
});

// render or refresh the chart (with data)...
queue.draw({
  queue: {QueueState:{Lowest:[{ExperimentId:"00000000-0000-0000-0000-000000000000"}]}},
  stats: {Stats:{"00000000-0000-0000-0000-000000000000":{Property:"foo"}}}
});
```

**4:** Alternatively, the QueueView chart can chart the Related processes of Work Items executing in a COMPS environment. The data which supplies this mode of the QueueView chart is gotten from the Request-Response routines internal to this code. These are the required configuration changes for implementing the Work Items mode: 
```javascript
import Queue from "path/to/queueView.js";

// instantiate the chart (for Work Items)...
const queue = new Queue({
  selector: "[itemid=myQueueView]",
  chartContainer:"#myQueueView",
  modeEntity: "WorkItems"
});

// render or refresh the chart...
queue.draw();
```

**5:** The QueueView chart can also chart [mock data](demo/data) or [repro capture](demo/data/repro.json) in either the Simulations or Work Items mode. The mocked data is essentially the expected Response JSON of each of the requisite Requests. The repro data can be captured from a running implementation for investigating any scenario that might occur. Using static data like these can facilitate development and testing of the code since a wide variety of scenarios can be tweaked into static data without actually running the corresponding work in COMPS. The QueueView has mechanisms internal to the code and an externalized API to navigate these sources. The required configuration changes for implementing mock data: 
```javascript
import Queue from "path/to/queueView.js";

// instantiate the chart (for mock data)...
const queue = new Queue({
  selector: "[itemid=myQueueView]",
  chartContainer:"#myQueueView",
  modeEntity: "WorkItems", /* or "Simulations" */
  useMockData: true,
  mockPath: "built/path/to/mock/data/", /* expected JSON should be here */
  api: function(mode,refresh) {
    /* Called upon mock draw from QueueView but within this scope.  */
  }
});

// render or refresh the chart...
queue.draw();
```

***

### Installation
This code is not intended as a standalone component which can simply be imported into a project. Some manual integration is necessary, especially the loading of expected CSS styes, HTML structures, and a JavaScript controller to supply Request-Response for Simulations (at least). However, it is possible to download this repository and run [the demo](/demo) to learn and better understand its mechanics. As well, this repository is intended for future development or could be forked as a starting place for alternative development. 

See [the demo](/demo) for instructions about running this application standalone. 

***

### Configuration Options
When instantiating this code, a configuration object is passed to the initializing method:
```javascript
import Queue from "path/to/queueView.js";

// instantiate the chart...
const queue = new Queue({
  selector: "[itemid=myQueueView]", /* root of entire assembly */
  chartContainer:"#myQueueView"
});
```
This supplies the code with any customizing parameters necessary for the particular implementation. It is not necessary to provide properties which are expected to assume the default. At runtime, these values can be gotten by the web client via the instance's [public API method](#public-methods-api), getConfig();

Most configurations have [public API method](#public-methods-api) for runtime adjustment.

| Property | Data Type | Default | Options |
|----------|-----------|---------|---------|
| `selector` | *String* | `"[itemid=QueueView]"` | **Required** A CSS-compliant selector of the encompassing root element of markup. |
| `chartContainer` | *String* | `#QueueView` | **Required** A CSS-compliant selector of a child of the root element. |
| `scoreSize` | *Integer* | `24` | Percentage between 0-100 within which arrow widths are scaled to show disparity. |
| `auth` | *Function* | `window.idmauth` | Returns an Auth instance, or internal NOP (nullifying calls). |
| `modeEntity` | *String* | `"Simulations"` | Also accepts "WorkItems". |
| `workFlowScope` | *Float* | `0` | Default disables, any float searches Work Items from that many days ago. |
| `workFlowsActive` | *Boolean* | `true` | False shows all Work Items, regardless of the state of Related items. |
| `useMockData` | *Boolean* | `false` | True expects mock data to supply the chart (not REST Request-Response). |
| `mockChoice` | *String* | `""` | A path relative to built code where default mock data resides. |
| `logging` | *Boolean* | `false` | True prints data collection to JavaScript console upon every render. |

***
### Public Methods (API)

Once instantiated in the web client code (see [Basic Usage](#basic-usage)), the local logic can be addressed via a variety of public methods, getters, and setters. These methods can be addressed within the scope of the instantiation, or via the browser's JavaScript console (when the instance is exposed to the window namespace).

```javascript
import Queue from "path/to/queueView.js";

// instantiate the chart...
const queue = new Queue({
  selector: "[itemid=myQueueView]", /* root of entire assembly */
  chartContainer:"#myQueueView"
});

queue.render();

// To expose the instance to the global namespace for access from browser's Dev Tools: 
if (!("queue" in window)) { window["queue"] = queue; }

// To call public methods from the JavaScript console of a browser's Dev Tools: 
window.queue.toggleDebug(true);

// The COMPS implementation exposes the "WorkItems" chart as "queueFlows", so: 
window.queueFlows.toggleDebug(true); // addresses "WorkItems" chart.

```

See the [Configuration Options](#configuration-options) for more explanation and additional public methods.

| Method Name | Argument(s) | Description |
|-------------|-------------|-------------|
| `draw` | *Config,Callback* | The fundamental render call. See [Configuration Options](#configuration-options). |
| `render` | *none* | Renders the current chart with current configuration and data. |
| `getCollection` | *none* | Returns the merged and transformed data that drew the current chart. |
| `getCollectionCount` | *none* | Returns the total number of items in Collection (drawn and not drawn). |
| `getConfig` | *none* | Returns all the current settings, by default or overridden. | 
| `setScoreSize` | *Integer* | Percentage between 0-100 within which arrow widths are scaled to show disparity. Rerenders upon reset. |
| `toggleMockSelect` | *Boolean* | Exchanges legend with select-option for mock data sources. True forces select-option control. |
| `setMock` | *Integer* | Sets final numerical directory found at `config.mockPath`, e/g `built/mockpath/1/...` |
| `setWorkFlowsScope` | *Float* | Sets number of days ago to search for non/terminal Top-Level Work Items. `0` disables (searching for only non-terminal Work Items). |
| `initialized` | *none* | Returns true whenever chart has been drawn with data (even if empty). |
| `toggleDebug` | *Boolean* | Switches between logging Collection data upon render and not. True forces log. | 
| `toggleRepro` | *none* | Switches between mode/API and rendering the static `repro.json`. |

*** 

### Using Mock Data

Since it can be inconvenient and difficult to run the many scenarios of work in the system which may be charted by this code, mechanisms have been integrated to allow the use of static JSON data as an alternative to API Response data. This can facilitate demonstration and development of the chart as well as test and verify proper implementation. 

The mock data for this library is found in the [demo/data](demo/data) path, but during the build process these must be copied into the build path so they are accessible at runtime within the deploy environment (or localhost). This copy can be stipulated in the [webpack.config](demo/webpack.config.js) of the project: 

```javascript
const CopyWebpackPlugin = require("copy-webpack-plugin");
module.exports = {
  plugins: [
    new CopyWebpackPlugin(
      [
        {
          from: "data",
          to: "data/[path][name].[ext]"
        }
      ],
      {
        copyUnmodified: true,
      }
    )
  ]
};
```
The directory structure found within the data/ path is assumed by the code's methods without deviation. Also, there are no internal systems assure the validity of the mock data, so it must be valid JSON or errors will occur. Future work could certainly make this more accommodating and dynamic, but at the risk of complicating the more important functionality of interfacing with the API. 

For "**Simulations**" mode, each JSON file represents the Response data of the API call corresponding with the file's name: 

1. [Queue.json](demo/data/Simulations/1/Queue.json) is the mock GET Response of [/api/Metrics/Queue](https://comps.idmod.org/api/json/metadata?op=MetricsQueueGetRequest).
2. [Stats.json](demo/data/Simulations/1/Stats.json) is the mock POST Response of [/api/Experiments/Stats](https://comps.idmod.org/api/json/metadata?op=ExperimentGetStatsRequest).
3. The ExperimentIds in the Queue data must also be found in the Stats data. 

For "**WorkItems**" mode, there are potentially four subsequent API calls to be made, from the originating search for Work Items, to then getting the items related to each of those, and then getting those items and the details of each of them. Therefore, these data can be an aggregate of several calls to the same API (but with differing Response data): 

1. [WorkItems.json](demo/data/WorkItems/1/WorkItems.json) is the mock GET Response of [/api/WorkItems](https://comps.idmod.org/api/json/metadata?op=WorkItemGetRequest).
2. [Related.json](demo/data/WorkItems/1/Related.json) is the mock GET Response of [/api/WorkItems/{Id}/Related](https://comps.idmod.org/api/json/metadata?op=WorkItemRelatedGetRequest).
3. [Entities.json](demo/data/WorkItems/1/Entities.json) is an aggregate of GET Responses of [/api/WorkItems](https://comps.idmod.org/api/json/metadata?op=WorkItemGetRequest), [/api/Experiments](https://comps.idmod.org/api/json/metadata?op=ExperimentGetRequest), and/or [/api/Simulations](https://comps.idmod.org/api/json/metadata?op=SimulationGetRequest).
4. Each of these data must have corresponding Ids, though the Entities data can be incomplete (which is accommodated).

*** 

### Using the Repro Data

When testing this system with runtime API Response data, it can be helpful to capture a state of the application so that it can be studied or debugged. For this purpose, the code can chart captured data to reproduce the runtime scenario in a development environment. 

At any time, the current collection of internalized data can be gotten from the chart via a command into the JavaScript console of a browser's Dev Tools (*f12*):
```javascript
// to peruse the data in its native object structure:
window.queue.getCollection(); 

// to capture the data as a string for transfer to repro.json:
JSON.stringify(window.queue.getCollection());

// to automatically print collection data to the Dev Tool's console upon every rendering: 
window.queue.toggleDebug(true);
```
See [public API method](#public-methods-api) for how to expose the chart instance to access from the browser's Dev Tools (*f12*).

The [data/repro.js](demo/data/repro.json) is expected to be at the root of the data/ path and will therefore be copied into the appropriate location at build time. This file must be valid JSON, so anything captured via JSON.stringify() should be stripped of the outermost quotation marks (which would make the contents a string rather than object). Copy-and-paste the captured data into this file or save the capture, place it at this location, and name it "repro.json".

Finally, when running the application with the newly-built repro data, set the chart to render it: 
```javascript
window.queue.toggleRepro();
```
It is important to toggle this state off when expecting normal functionality from the charting system. 