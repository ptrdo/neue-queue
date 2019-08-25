###### This is released software. Please **[log issues](/issues)** found.
# Dashboard
A Means for Visualizing Progress of Work Processing on High Performance Computing (HPC) Cluster as Implemented by the Institute for Disease Modeling's **Computational Modeling Platform Service** (COMPS)

This JavaScript module, [queueView.js](/queueView.js), should allow a web client to facilitate access to data available from the [COMPS API](https://comps.idmod.org/api/metadata) via conventional Representational State Transfer (REST) protocol, also known as [RESTful web services](https://en.wikipedia.org/wiki/Representational_state_transfer).

This is the same code implemented in the COMPS Web Client. Included within this repository is the required JavaScript, interface template (HTML), and styling (CSS). A simple demonstration is provided (see [the demo](/demo)). An illustration of this design: 

***
![A prototype.](demo/illustration.png)
***

### Basic Usage
**1:** In an HTML document, simply attach the CSS and provide for an expected page structure (the code leverages this structure to append other elements at runtime):
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
        <output title="The Title of My Chart" id="myQueueView"></output>
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
  selector: "[itemid=myQueueView]",
  chartContainer:"#myQueueView"
});

// render or refresh the chart...
queue.draw();
```

**3:** By default, the QueueView chart is configured to chart the Simulations of an Experiment executing in a COMPS environment. However, the data which supplies this mode of the QueueView chart are expected to be supplied by routines external to this code. This data is assumed to be the normal Response of the two COMPS API calls, [/api/Metrics/Queue](https://comps.idmod.org/api/json/metadata?op=MetricsQueueGetRequest) and [/api/Experiments/Stats](https://comps.idmod.org/api/json/metadata?op=ExperimentGetStatsRequest), and can be delivered via the instantiating config options or parameters of the draw method. So, as an alternative to the above: 
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

// instantiate the chart...
const queue = new Queue({
  selector: "[itemid=myQueueView]",
  chartContainer:"#myQueueView",
  modeEntity: "WorkItems"
});

// render or refresh the chart...
queue.draw();
```

**5:** The QueueView chart can also chart [mock data](demo/data) in either the Simulations or Work Items mode. The mocked data is essentially the expected Response JSON of each of the requisite Requests. Using mocked data can facilitate development and testing of the code since a wide variety of scenarios can be mocked without actually running the corresponding work in COMPS. The QueueView has mechanisms internal to the code and an externalized API to navigate the mock data. These are the required configuration changes for implementing mock data: 
```javascript
import Queue from "path/to/queueView.js";

// instantiate the chart...
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

### Installation
While it is possible to simply clone or download this repository and drag the code into a project, it is recommended to use a package manager to maintain version control and facilitate keeping dependent projects current with the latest changes. This is critical software that should be expected to change, and the most-current version is the only version guaranteed to work with the COMPS system.

[NodeJS](https://nodejs.org/en/download/) is a technology which can execute scripts on a computer. In this application, NodeJS fasciliates the Webpack framework in assembling the various ingredients of the Client code, preparing them for deployment from a server to a browser. It is recommended to install NodeJS to add this code to another project or run the enclosed demonstration.

The Node Package Manager ([NPM](https://www.npmjs.com/get-npm)) is installed as a component of NodeJS and is a popular means for executing the `package.json` of a project.
