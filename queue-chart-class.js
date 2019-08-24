/**
 * THIS IS THE ESSENTIAL STRUCTURE
 *
 * queue-chart
 * Dashboard visualiser of cluster traffic
 *
 * @author psylwester(at)idmod(dot)org
 * @version 1.00, 2019/06/12
 * @requires (framework)
 *
 */

const CONFIG = {};

const collection = {

  input: {},
  output: {},

  transform: function (input) {

    input["transformed"] = true;

    this.output = input;
  },

  get latest() {
    return this.output;
  },

  set newest(data) {
    this.input = data;
    this.transform(data);
  }

};

const render = function () {

  return this;
};

const update = function (data) {

  collection.newest = data;
};

const query = function () {

  return collection.latest;
};

const destroy = function () {

};

export default { render, update, query, destroy }