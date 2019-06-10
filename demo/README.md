###### This is pre-release software. Please **[log issues](/issues)** found.
# Demo of queue-chart.js
Sample implementation of Dashboard module(s) intended for monitoring work within the Institute for Disease Modeling's **Computational Modeling Platform Service** (COMPS)

>**Warning. This code is the real deal.** Authentication into the COMPS system provides for useful interactions, but also the potential disruption of actual research and destructive transactions from which there is no recourse. Any implementation of this code **must** be done with the advice, consent, and review of COMPS engineers! Otherwise, access to the system and/or this code may be suspended or revoked.

Run this demonstration in a web browser. A web server (or localhost) is required for demonstrating complete functionality. The code here references dependencies via a relative path, so it is recommended to run this entire repository intact.

***
### Running this Demo
This example demonstrates integration into a minimal [ES6-compliant](http://es6-features.org/) project bundled by the [Webpack](https://webpack.js.org/) library. An enclosed `package.json` designates all dependencies required for running the demonstration. Note: This example may not work as expected in the Internet Explorer browser.

>*This is the current methodology of COMPS and the Quick Start web clients.*

[NodeJS](https://nodejs.org/en/download/) is a technology which can execute scripts on a computer. In this application, NodeJS fasciliates the Webpack framework in assembling the various ingredients of the Client code, preparing them for deployment to a browser. It will be necessary to install NodeJS to run these examples.

The Node Package Manager ([NPM](https://www.npmjs.com/get-npm)) is installed as a component of NodeJS and is a popular means for executing the `package.json` of a project.

**1:** From a command prompt, navigate to the project path where the clone of this repository is installed, and then the path where the relevant `package.json` file exists.
```sh
> cd C:\path\to\COMPS-UI-Dashboard
```
**2:** From a command prompt, run the NPM `install` command to get the dependencies as prescribed in the `package.json` file. This will create a path local to this project `\node_modules` for deposit of the downloaded code. There may be a considerable number of dependencies, so this process could take a minute or so.
```sh
> npm install
```
**3:** Now do the same two steps above but for the demo code. 
```sh
> cd demo
> npm install
```
**4: NOTE!** This demo employs a project which provides authorization into COMPS. This is a private repository which may require configuration of the NPM client. If the previous step #3 failed attempting to download `COMPS-UI-Auth`, then proceed with this step to resolve. Otherwise, proceed to step #5.
```sh
> npm config set registry https://packages.idmod.org/api/npm/npm-production/
```

**5:** From a command prompt, run the NPM `start` command which has been configured in the `webpack.config.js` to instruct Webpack to survey the dependencies prescribed in the project code and then compile the bundled JavaScript.
```sh
> npm start
```
**6:** Open a browser and navigate to `http://localhost:8081` to view the deployed code. Note: If this does not work, there may be a conflict with other processes, so the `8081` port can be changed by [configuring the devServer](https://webpack.js.org/configuration/dev-server/).