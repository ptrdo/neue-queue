    "use strict";

    /** THIS IS THE LEGACY VERSION */

    /** IMPORTANT
     *  This has been forked by queuework.js and there is much commonality (for sake of expediency).
     *  The required data transformations are different and these ought to be extended from the same pattern.
     *  TODO: Abstract and consolidate functionality and provide extendibly to accomodate both instances.
     */


var queue = function (instantiations) {

      var instance = function (settings) {

        /**
         * @private
         * @property {Object} options are component defaults (can be overriden upon instantiation).
         * @property {Integer} hardLimit is the maximum number of items to render (per Priority Bucket).
         * @property {Boolean} useProportionalBucket when true uses flex "score" to set width of Priority Buckets.
         * @property {Boolean} ie10 when true will render differently (to accommodate for lack of flex support).
         * @property {Boolean} ie when true will render differently (to accommodate for lack of flex support).
         * @property {Boolean} ff when true will render differently (to accommodate for difference of opinion about scrollTop).
         */
        var options = _.defaults(settings, { truncate: true, truncateLimit: 5 }),
            hardLimit = 100,
            useProportionalBuckets = false,
            ie10 = $("html").is("[data-useragent*='Trident/6']"),
            ie = $("html").is("[data-useragent*=Trident]"),
            ff = $("html").is("[data-useragent*='Gecko/']");

        /**
         * @public (defaults set here, getter/setters in public API below)
         * @property {Boolean} useMockData when true will employ data found here.
         * @property {Boolean} shuffle would randomize mock data (false is always assumed, true is transient upon draw).
         * @property {Array} data is the REST response collection.
         * @property {Object} queue is data addendum.
         * @property {Object} stats is data addendum.
         * @property {String} selector (css) is set during instantiation (a default is here).
         */
        var useMockData = true,
            shuffle = false,
            data = [],
            queue = {},
            stats = {},
            selector = "body";

        /* PRIVATE STATIC */

        var QUEUE = [
          { name: "Lowest", display: "Lowest Priority" },
          { name: "BelowNormal", display: "Below Normal" },
          { name: "Normal", display: "Normal Priority" },
          { name: "AboveNormal", display: "Above Normal" },
          { name: "Highest", display: "Highest Priority" }
        ];

        var STATE = [
          "Created",
          "CommissionRequested",
          "Provisioning",
          "Commissioned",
          "Running",
          "Retry",
          "Succeeded",
          "Failed",
          "CancelRequested",
          "Canceled"
        ];

        var LEGEND = [
					{ name: "Orphaned", title: "Simulations\nwithout an\nExperiment" },
          { name: "Commissioned", title: "CommissionRequested\nProvisioning\nCommissioned" },
          { name: "Running", title: "Running" },
          { name: "Retry", title: "Retry" },
          { name: "Succeeded", title: "Succeeded" },
          { name: "Failed", title: "Failed" },
          { name: "Canceled", title: "Canceled\nCancelRequested" },
          { name: "Yours", title: "Yours" }
        ];

        /* MOCK DATA (Sim/Exp/Ste) */

        var MOCK = {

          "Lowest": [{
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T21:40:51.3930000Z",
            "LastCreateTime": "2016-04-05T21:46:39.6570000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "kmccarthy",
            "SimulationCount": 300,
            "SimulationStateCount": {
              "CommissionRequested": 300
            }
          }, {
            "ExperimentId": null,
            "FirstCreateTime": "2016-04-05T19:34:06.6630000Z",
            "LastCreateTime": "2016-04-05T19:45:35.8530000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "jsteinkraus",
            "SimulationCount": 100,
            "SimulationStateCount": {}
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "tting",
            "SimulationCount": 200,
            "SimulationStateCount": {
              "CommissionRequested": 200
            }
          }],

          "BelowNormal": [], /* [{
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T18:19:05.2650000Z",
            "LastCreateTime": "2016-04-05T18:19:05.2650000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 1,
            "SimulationStateCount": {
            "CommissionRequested": 1
            }
          }],
          */

          "Normal": [{
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T21:40:51.3930000Z",
            "LastCreateTime": "2016-04-05T21:46:39.6570000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 1000,
              "Succeeded": 4000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:34:06.6630000Z",
            "LastCreateTime": "2016-04-05T19:45:35.8530000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 1500,
              "Succeeded": 3500
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 2000,
              "Succeeded": 3000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 2500,
              "Succeeded": 2500
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 5000,
            "SimulationStateCount": {
              "Running": 5000
            }
          }],


/*
          "Normal": [{
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T21:40:51.3930000Z",
            "LastCreateTime": "2016-04-05T21:46:39.6570000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "kmccarthy",
            "SimulationCount": 3000,
            "SimulationStateCount": {
              "CommissionRequested": 2000,
              "Provisioning": 900,
              "Canceled": 100
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:34:06.6630000Z",
            "LastCreateTime": "2016-04-05T19:45:35.8530000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 1000,
            "SimulationStateCount": {
              "CommissionRequested": 1000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "tting",
            "SimulationCount": 500,
            "SimulationStateCount": {
              "CommissionRequested": 500
            }
          }],
*/

          "AboveNormal": [], /* [{
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T21:40:51.3930000Z",
            "LastCreateTime": "2016-04-05T21:46:39.6570000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "kmccarthy",
            "SimulationCount": 1000,
            "SimulationStateCount": {
              "CommissionRequested": 500,
              "Running": 300,
              "Succeeded": 200
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:34:06.6630000Z",
            "LastCreateTime": "2016-04-05T19:45:35.8530000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "jsteinkraus",
            "SimulationCount": 2000,
            "SimulationStateCount": {
              "CommissionRequested": 2000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T21:40:51.3930000Z",
            "LastCreateTime": "2016-04-05T21:46:39.6570000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "kmccarthy",
            "SimulationCount": 100,
            "SimulationStateCount": {
              "Succeeded": 50,
              "Running": 50,
              "CommissionRequested": 100
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:34:06.6630000Z",
            "LastCreateTime": "2016-04-05T19:45:35.8530000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "jsteinkraus",
            "SimulationCount": 2000,
            "SimulationStateCount": {
              "CommissionRequested": 2000
            }
         }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:32:37.3370000Z",
            "LastCreateTime": "2016-04-05T19:34:06.4070000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "tting",
            "SimulationCount": 500,
            "SimulationStateCount": {
              "CommissionRequested": 500
            }
         }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:36:00.0000000Z",
            "LastCreateTime": "2016-04-05T19:38:00.0000000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "tting",
            "SimulationCount": 2000,
            "SimulationStateCount": {
              "CommissionRequested": 2000
            }
         }, {
           "ExperimentId": null,
            "FirstCreateTime": "2016-04-05T19:34:06.6630000Z",
            "LastCreateTime": "2016-04-05T19:45:35.8530000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 100,
            "SimulationStateCount": {}
         }], */

          "Highest": [{
            "ExperimentId": "644064bc-025b-e411-93f6-f0921c16b9e0",
            "FirstCreateTime": "2016-04-05T21:40:51.3930000Z",
            "LastCreateTime": "2016-04-05T21:46:39.6570000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "kmccarthy",
            "SimulationCount": 4000,
            "SimulationStateCount": {
              "CommissionRequested": 500,
              "Running": 500,
              "Succeeded": 2000,
              "Failed": 1000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T19:34:06.6630000Z",
            "LastCreateTime": "2016-04-05T19:45:35.8530000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "jsteinkraus",
            "SimulationCount": 2000,
            "SimulationStateCount": {
              "CommissionRequested": 100,
              "Running": 200,
              "Retry": 200,
              "Succeeded": 1500
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T18:19:05.2650000Z",
            "LastCreateTime": "2016-04-05T18:19:05.2650000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 4000,
            "SimulationStateCount": {
              "CommissionRequested": 1000,
              "Running": 3000
            }
          }, {
            "ExperimentId": "225abe99-7e2c-e411-93f2-f0921c167860",
            "FirstCreateTime": "2016-04-05T18:19:05.2650000Z",
            "LastCreateTime": "2016-04-05T18:19:05.2650000Z",
            "ElapsedHoursAgo": 1,
            "NodeGroup": "emod_ab",
            "Owner": "psylwester",
            "SimulationCount": 1,
            "SimulationStateCount": {
              "CommissionRequested": 1
            }
          }]
        };

        /* UTILITIES */

        /**
         * computeElapsedHoursAgo determines hours between now and aprovided date string.
         *
         * @private
         * @param {String} dateString is a Date parseable string (converted to Zulu as needed).
         * @returns {Number} the hours elapsed.
         */
        var computeElapsedHoursAgo = function (dateString) {
          var zuluTime = dateString.split("Z")[0] + "Z";
          var created = new Date(Date.now() - Date.parse(zuluTime));
          var elapsed = Math.round(((created.getTime() / 100) / 60) / 60) / 10;
          return elapsed;
        };

        /**
         * vitalizeStaticData updates mock data to quasi-current times while adding a viable ExperimentId.
         *
         * @private
         * @param {object} src (required) is the static data to groom with current dates (usually MOCK).
         * @param {function} callback (optional) code to execute after data massage.
         * @returns {null} data is groomed in-place.
         */
        var vitalizeStaticData = function (src, callback) {
          var yesterday = new Date(Date.now() - (24 * 60 * 60 * 1000));
          var yesterdate = yesterday.toISOString().split("T")[0];
          var mockId = window.comps.util.generateGuid();
          var eightHoursAgo = function(dateString) {
            var recently = new Date(Date.parse(yesterdate + "T" + dateString.split("T")[1]) + (16 * 60 * 60 * 1000));
            return recently.toISOString();
          };
          var update = function () {
            for (var bucket in src) {
              if (src.hasOwnProperty(bucket)) {
                src[bucket].forEach(function (item) {
                  if (item.hasOwnProperty("ExperimentId") && !!item["ExperimentId"]) {
                    /* orphaned groups are "ExperimentId" === null; */
                    item["ExperimentId"] = mockId;
                  }
                  if (item.hasOwnProperty("FirstCreateTime")) {
                    item["FirstCreateTime"] = eightHoursAgo(item["FirstCreateTime"]);
                    item["ElapsedHoursAgo"] = computeElapsedHoursAgo(item["FirstCreateTime"]);
                  }
                  if (item.hasOwnProperty("LastCreateTime")) {
                    item["LastCreateTime"] = eightHoursAgo(item["LastCreateTime"]);
                  }
                });
              }
            }
            if (!!callback && callback instanceof Function) {
              callback();
            }
          };
          window.comps.restclient.getAsync(
            "/api/Experiments?format=json&orderby=DateCreated+desc&count=1&offset=0",
            function (xhr) {
              if (!xhr["responseText"] || _.isUndefined(xhr.responseText)) {
                update();
              } else {
                var response = JSON.parse(xhr.responseText);
                if (!!response && "Experiments" in response && response.Experiments.length > 0 && "Id" in response.Experiments[0]) {
                  mockId = response.Experiments[0]["Id"];
                  update();
                } else {
                  update();
                }
              }
            },
            function() { update(); },
            true
          );
        };

        /**
         * shuffleStaticData redistributes the data according to REST response structure.
         *
         * @private
         * @param {Array} src (required) the collection to shuffle (e.g. MOCK).
         * @returns {Array} the shuffled collection
         */
        var shuffleStaticData = function (src) {
          var items = _.shuffle(_.flatMap(src));
          var shoe = {};
          QUEUE.forEach(function(bucket) {
            shoe[bucket.name] = [];
          });
          while (items.length > 0) {
            shoe[_.sample(QUEUE).name].push(items.pop());
          }
          return shoe;
        };

        /**
         * fetchItemDetail gets information not supplied in original Queue request.
         *
         * @private
         * @param {GUID} id (required) the ExperimentId
         * @param {Function} callback (optional) code to execute upon success (no error is handled).
         * @returns {null}
         */
        var fetchItemDetail = function (id, callback) {
          window.comps.restclient.getAsync(
            "/api/Experiments?format=json&Id=" + id,
            function(xhr) {
              if ("responseText" in xhr) {
              	if (!!callback && callback instanceof Function) {
              		var info = JSON.parse(xhr.responseText);
              		if ("Experiments" in info && !_.isEmpty(info["Experiments"])) {
              			callback(info["Experiments"][0]);
		              }
                }
              }
            },
            function() {
            	if (!!callback && callback instanceof Function) {
            		callback(null);
            	}
            },
            true
          );
        };

        /* EVENT HANDLERS */

        var handleMouseEnter = function (event) {
          event.stopPropagation();

          var $item = $(event.target).closest("ul.item").first();
          var width = parseInt($item.find("dfn.tooltip:first > a > dl").width());
          var left = parseInt($item.offset().left);
          var indent = parseInt($item.find(">li.block").first().width());
          var top = parseInt($item.closest("output").scrollTop());
          var mleft = Math.max(event.pageX, (left + indent)) - left - indent - width;
          if ((mleft + left) < 0) { mleft = -20; }
          else if (ie) {
            /* IE-specific adjustment (due to flex) */
            mleft += indent;
          }
          $item.find("dfn.tooltip:first")
          .css({
            marginLeft: mleft,
            marginTop: !!ff ? 0 : -top /* FF-specific adjustment (due to scrollTop) */
          });

          if (!$item.is(".detailed")) {
            if (!!$item.data("id")) {
            	fetchItemDetail($item.data("id"), function (data) {
                if (!!data && "Name" in data) {
	                $item.find("dt:first").text(data.Name);
                }
              });
            }
            $item.addClass("detailed");
          }
        };

        var handleMouseLeave = function (event) {

        };

        var handleClick = function (event) {

        };

        /* VIEW CONSTRUCTOR */

        var render = function (callback) {

          var currentUser = _.invoke(window, "comps.context.getUserName") || "";

          var $el = $(selector+":visible").off(".queue").empty();
          var $div, $ol, $li, $ul, $a, item, id, val, total, max, status, owner, title, link, legend;

          var truncateLimit = !!options && options.hasOwnProperty("truncateLimit") ? parseInt(options.truncateLimit) : 5; /* TODO: magic number! */
          var truncateable = _.max(_.map(data, function (bucket) { return bucket.length; })) > truncateLimit;
          var totalCount = _.isEmpty(data) ? 0 : _.map(data, function (bucket) { return _.isArray(bucket) ? bucket.length : 0; }).reduce(function (a, b) { return a + b; });

          var truncateToggle = $el.closest("figure").find("ins.truncation").get(0);
          var truncated =
            !truncateable ? false
            : $el.closest("figure").hasClass("truncated") ? true
            : $el.closest("figure").hasClass("untruncated") ? false
            : (!!options && options.hasOwnProperty("truncate") ? options.truncate : true);

          $el.toggleClass("entre", !(truncateable && !truncated));
          if (!truncateable) {
            $el.closest("figure").removeClass("truncated untruncated");
          } else {
            $el.closest("figure")
              .toggleClass("truncated", truncated)
              .toggleClass("untruncated", !truncated);
          }

          /* RENDER EACH ITEM IN QUEUE */
          for (var i = 0; i < QUEUE.length; i++) {

            $div = $("<div/>").addClass("queue-bucket").appendTo($el);
            $ol = $("<ol/>").appendTo($div);
            max = 0;

            if (_.has(data, QUEUE[i].name) && data[QUEUE[i].name].length > 0) {
              for (var j = 0; j < data[QUEUE[i].name].length; j++) {

                if (j >= truncateLimit) {
                  if (truncated) {
                    break;
                  }
                }
                if (j >= hardLimit) {
                  break;
                }

                item = data[QUEUE[i].name][j];
                id = item["ExperimentId"] || null;
                owner = item["Owner"] || null;
                total = item["SimulationCount"];
                title = [];
                link = "/#explore/Simulations?filters=";

                $li = $("<li/>").appendTo($ol);
                $ul = $("<ul/>").toggleClass("owner", owner === currentUser).appendTo($li);

                if (_.isEmpty(item["SimulationStateCount"])) {
                	if (_.isEmpty(id)) {

		                /* this is a quasi-Experiment of orphan Simulations */
		                val = total;
		                link += "Owner=" + owner
			                + ",DateCreated>=" + item["FirstCreateTime"]
			                + ",DateCreated<=" + item["LastCreateTime"];

		                $a = $("<a/>").attr({ href: link, title: "Explore Orphan Simulations" });
		                $("<li/>")
			                .addClass("Orphan")
			                .append($a.append($("<var/>").text(val < 1000 ? val : ((Math.round(val / 100) / 10) + "k"))))
			                .css("flex-grow", val)
			                .appendTo($ul);

                	} else {

                		// Queue polling has a built-in latency, so an item
										// could persist in data beyond when it was deleted.
										// Hence, the SimulationStateCount returned nothing.
		                total = 0;
		                $li.remove();
		                continue;

                	}

                } else {

	                link += "ExperimentId=" + id;
                	for (var k = 0; k < STATE.length; k++) {
                    if (item["SimulationStateCount"].hasOwnProperty(STATE[k])) {
                      status = STATE[k];
                      val = parseInt(item["SimulationStateCount"][status]);
                      $a = $("<a/>").attr({ href: (link + ",SimulationState=" + STATE[k]), title: "Explore " + STATE[k] + " Simulations" });
                      $("<li/>")
                        .addClass(status)
                        .toggleClass("process", /Running|Retry|Provisioning/.test(status))
                        .append($a.append($("<var/>").text(val < 1000 ? val : ((Math.round(val / 100) / 10) + "k"))))
                        .css("flex-grow", val)
                        .appendTo($ul);
                    }
                  }
                }

                $("li:last", $ul).append($("<ins/>").addClass("arrow").append("<b/>"));
                $li.css("margin-right", j * 10);

                $ul.attr("title", title.join("\n"))
                  .addClass("item")
                  .data({
                    id: id,
                    link: link,
                    total: total
                  });

                /* PRERENDER TOOLTIPS */
                var $block = $("<li/>").addClass("block").prependTo($ul);
                var $dfn = $("<dfn/>").addClass("tooltip").prependTo($block);
	              var $link = $("<a/>").attr({ href: link }).appendTo($dfn); /* NOTE: title would occlude tooltip */
                var $dl = $("<dl/>").appendTo($link);
                var elapsed = item["ElapsedHoursAgo"];

                $("<dt/>").appendTo($dl);
                $("<dd/>").append($("<var/>").text("Owner")).append($("<data/>").text(owner)).appendTo($dl);
                $("<dd/>").append($("<var/>").text("Experiment")).append($("<data/>").text(!!id ? id.substr(0, id.indexOf("-") + 5) : "Orphans").append($("<sup/>").html("&hellip;"))).appendTo($dl);
                $("<dd/>").append($("<var/>").text("Node Group")).append($("<data/>").text(item["NodeGroup"])).appendTo($dl);
                $("<dd/>").append($("<var/>").text("Created")).append($("<data/>").html(
                  elapsed > .1 ? "~" + elapsed + " hrs ago <i>@ last refresh</i>": "moments ago <i>@ last refresh</i>"
                )).appendTo($dl);
                if (!_.isEmpty(item["SimulationStateCount"])) {
                  $("<dd/>").append($("<var/>").text("Simulations")).append($("<data/>").text(item["SimulationCount"])).appendTo($dl);
                  $("<dd/>").append($("<hr/>")).appendTo($dl);
                  for (var l = 0; l < STATE.length; l++) {
                    if (item["SimulationStateCount"].hasOwnProperty(STATE[l])) {
                      $("<dd/>").append($("<var/>").text(STATE[l])).append($("<data/>").text(item["SimulationStateCount"][STATE[l]])).appendTo($dl);
                    }
                  }
                }

                max = Math.max(total, max);
              }

              if (max === 0) {
              	// logic within for-loop above can continue through item(s)
              	// resulting in a potential for an empty queue bucket.
              	$ol.append($("<li/>").text("empty"));
              } else {
              	$div.closest(".queue-bucket").css("flex-grow", max);
              }

            } else {
              $ol.append($("<li/>").text("empty"));
            }

            $div.find(".block").each(function (index, ele) {
              if (ie10) {
                /* IE10 won't do proportional sizing with flex-grow, so a width rule will suffice (at 50% strength) */
                $(ele).addClass("flex-faux").css("width", Math.floor(50 * (1 - ($(ele).closest("ul").data("total") / max))) + "%");
              } else {
                $(ele).css("flex-grow", max - $(ele).closest("ul").data("total"));
              }
            });

            $("<label/>").text(QUEUE[i].display).prependTo($div);
            $div.toggleClass("empty", !data || _.isEmpty(data) || !_.has(data, QUEUE[i].name) || data[QUEUE[i].name].length < 1 || max === 0);
          }

          /* INSERT LEGEND CONTROL (deprecating) */
          if ($el.closest("form").find("legend").children().not("button.refresh").length < 2) {
            legend = $el.closest("form").find("legend").first();
            $(LEGEND).each(function (i, v) {
              var t = v.name !== "Yours" ? v.title : "Owner: " + currentUser;
              $("<span/>").addClass(v.name).text(v.name).attr("title", t).prependTo(legend);
            });
          }

          if (!useProportionalBuckets) {
            var bucketGrowSum = 6000; /* divisible by 1,2,3,4,5 */
            var $bucketsOccupied = $el.find(".queue-bucket:not(.empty)");
            $bucketsOccupied.css("flex-grow", function () {
              return Math.floor(bucketGrowSum / $bucketsOccupied.length);
            });
          }

          /* UPDATE PERSISTING ELEMENTS */
          $(truncateToggle)
          .toggleClass("ignore", !truncateable)
          .find("var").text(totalCount);

          /* TRIGGER ANIMATION */
          setTimeout(function () {
            $el.removeClass("entre");
          }, 200);

          /* APPLY EVENT HANDLERS */
          $el.on("mouseenter.queue", "ul.item li", handleMouseEnter);
          $el.closest(".chart").toggleClass("mocked", useMockData);

          /* DONE! */
          if (!!callback && callback instanceof Function) {
            callback();
          }
        };

        /* PUBLIC API */

        return {

          /**
           * draw consumes options (applied at instantiation)
           * and overrides (applied during this call)
           * then renders chart accordingly.
           *
           * @public
           * @param {Object} overrides (optional) modification since instantiation.
           * @param {Function} callback (optional) code to execute upon render.
           * @returns {null}
           */
          draw: function (overrides, callback) {

            if (!!options) {
              for (var prop in options) {
                if (this.hasOwnProperty(prop)
                && this[prop] instanceof Function) {
                  this[prop](options[prop]);
                }
              }
            }

            if (!!overrides) {
              for (var p in overrides) {
                if (this.hasOwnProperty(p)
                && this[p] instanceof Function) {
                  this[p](overrides[p]);
                }
              }
            }

            if (useMockData) {

              if (!!overrides && "shuffle" in overrides && overrides.shuffle) {
                MOCK = shuffleStaticData(MOCK);
              }

              vitalizeStaticData(MOCK, function () {
                data = MOCK;
                render(callback);
              });

            } else {


              data = _.cloneDeep(queue);
              for (var q in data) {
                if (data.hasOwnProperty(q)) {
                  for (var i = 0; i < data[q].length; i++) {

                    data[q][i]["ElapsedHoursAgo"] = computeElapsedHoursAgo(data[q][i]["FirstCreateTime"]);
                    if (_.has(stats, data[q][i]["ExperimentId"])) {
                      data[q][i]["SimulationCount"] = stats[data[q][i]["ExperimentId"]]["SimulationCount"] || data[q][i]["SimulationCount"] || 1;
                      data[q][i]["SimulationStateCount"] = _.cloneDeep(stats[data[q][i]["ExperimentId"]]["SimulationStateCount"]) || {};
                      data[q][i]["SimulationUsage"] = _.cloneDeep(stats[data[q][i]["ExperimentId"]]["SimulationUsage"]) || {};
                    } else {
                      data[q][i]["SimulationCount"] = data[q][i]["SimulationCount"] || 1;
                      data[q][i]["SimulationStateCount"] = {};
                      data[q][i]["SimulationUsage"] = {};
                    }
                  }
                }
              }

              render(callback);
            }
          },

          useMockData: function(boo) {
            if (!arguments.length) { return useMockData; }
            useMockData = !!boo;
            return this;
          },

          queue: function (value) {
            if (!arguments.length) { return queue; }
            queue = value;
            return this;
          },

          stats: function (value) {
            if (!arguments.length) { return stats; }
            stats = value;
            return this;
          },

          data: function (value) {
            if (!arguments.length) { return data; }
            data = value;
            return this;
          },

          selector: function (value) {
            if (!arguments.length) { return selector; }
            selector = value;
            return this;
          },

          refresh: function (values) {
            /* TODO: implement as low-cost alternative to render(); */
            if (!!values) {
              this.data(values);
            }
          }
        };
      }(instantiations);

      return instance;
    };


export default queue;
