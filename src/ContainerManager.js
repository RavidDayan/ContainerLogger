const Docker = require("dockerode");
const Storage = require("./storageLayer");
const { batchLimit, timeLimit, dbUrl } = require("./config");
const Container = require("./containerLog");
const Log = require("./log");

class ContainerManager {
  constructor(dbUrlConnection) {
    this.docker = new Docker(); // Instantiate Docker instance
    this.storage = new Storage(dbUrlConnection);
    this.containers = [];
    this.logsBatch = [];
    this.service = false;
    this.timeLimit = 0;
  }

  serviceStatueWrapper(func) {
    if (service) {
      func();
    } else {
      console.log("service is offline");
    }
    return service;
  }
  //counts up to the limit until next batch sending
  //done
  stopCounter() {
    clearInterval(this.intervalId);
    this.timeLimit = 0;
  }
  startCounter() {
    this.intervalId = setInterval(async () => {
      this.timeLimit++;

      if (this.timeLimit > timeLimit) {
        this.stopCounter();
        await this.addLogsToDb();
        this.startCounter();
      }
    }, 1000);
  }
  //basic add/remove/pop/has ,compare by container id.
  //done
  addContainer(container) {
    this.containers.forEach((stored) => {
      if (container.id === stored.id) {
        return false;
      }
    });
    this.containers.push(container);
    return true;
  }
  removeContainer(container) {
    for (let i = 0; i < this.containers.length; i++) {
      if (container.id === this.containers[i].id) {
        this.containers.splice(i, 1);
        return true;
      }
    }
    return false;
  }
  popContainer(container) {
    for (let i = 0; i < this.containers.length; i++) {
      if (container.id === this.containers[i].id) {
        let returnedContainer = this.containers[i];
        this.containers.splice(i, 1);
        return returnedContainer;
      }
    }
    return false;
  }
  hasContainer(container) {
    for (let i = 0; i < this.containers.length; i++) {
      if (container.Id === this.containers[i].id) {
        return true;
      }
    }
    return false;
  }

  // Attach/detach  to a container and track it
  //done
  async attachToContainer(containerId) {
    try {
      const container = new Container(
        containerId,
        this.logHandler,
        this.logHandler,
        this.logHandler,
        this
      );
      await this.storage.addContainer(containerId);
      this.addContainer(container);
      console.log(
        `\ncontainer ${containerId} \n has been successfully attached`
      );
    } catch (error) {
      console.log(`\ncould not attach container ${containerId}:\n${error}`);
    }
  }
  async detachContainer(containerId) {
    try {
      await this.storage.removeContainers([containerId]);
      const detachedContainer = this.popContainer(
        this.docker.getContainer(containerId)
      );
      detachedContainer.removeListeners();
      console.log(`container ${containerId} \n has been successfully detached`);
    } catch (error) {
      console.log(`could not detach container ${containerId}:\n${error}\n`);
    }
  }

  //event listeners for logs
  //done
  logHandler = (containerId, timeStamp, data) => {
    const logObject = new Log(containerId, timeStamp, data);
    this.logsBatch.push(logObject);
    if (this.logsBatch.length > batchLimit) {
      this.addLogsToDb();
    }
  };

  //add and remove items from database
  addLogsToDb = async () => {
    try {
      let currentBatch = [...this.logsBatch];
      let outcome = await this.storage.addLogs(currentBatch);
      this.removeSavedLogs(currentBatch, this.logsBatch);
      return outcome;
    } catch (error) {
      console.log(`\n could not store logs :\n${error}`);
    }
  };
  async retrieveLogs(containerId, startDate, endDate) {
    const logs = await this.storage.getLogs(containerId, startDate, endDate);
    console.log(`Logs for container ${containerId}:`);
    console.log(logs);
  }
  removeSavedLogs(remove, removedFrom) {
    remove.forEach((log) => {
      for (let i = removedFrom.length - 1; i >= 0; i--) {
        if (
          removedFrom[i].containerId === log.containerId &&
          removedFrom[i].log === log.log &&
          removedFrom[i].timeStamp === log.timeStamp
        ) {
          removedFrom.splice(i, 1);
        }
      }
    });
  }

  // start/stop logging service
  //need to add a crash fix option
  //need to use trycatch clause
  async startService() {
    // if (this.service) {
    //   console.log("service is already running");
    // }
    // if (await this.storage.getServiceState()) {
    //   console.log(
    //     "it seems the service did not end properly,would you like to fix it(Y/N)?"
    //   );
    //   //fix crashlogic
    // } else {
    await this.storage.connectDb();
    await this.storage.setServiceState(true);
    this.startCounter();
    console.log("service is running");
    // }
  }
  //done
  async stopService() {
    try {
      //stop timelimit to add logs to db counter
      this.stopCounter();
      //remove all listeners from containers
      this.containers.forEach((container) => {
        container.removeListeners();
      });
      //send all remaining logs to database
      await this.addLogsToDb();
      //remove all listened containers from db
      let containersId = this.containers.map((container) => {
        return container.id;
      });
      await this.storage.removeContainers(containersId);
      //set service to off
      await this.storage.setServiceState(false);
      //disconnect from database
      this.storage.disconnectDb();
      //discard listened containers
      this.containers = [];
      this.service = false;
      console.log("service is off");
    } catch (error) {
      console.log(`service stop failed: ${error}`);
    }
    return true;
  }

  // Get a list of all running containers//need to print the containers nicely
  async getAllRunningContainers() {
    try {
      const containers = await this.docker.listContainers({ all: true });
      let containerInfoList = containers.map((container) => {
        if (this.hasContainer(container)) {
          return { att: true, id: container.Id, name: container.Names[0] };
        } else {
          return { att: false, id: container.Id, name: container.Names[0] };
        }
      });
      this.printContainers(containerInfoList);
    } catch (error) {
      console.log(`\n could not get all running containers\n:${error}\n`);
    }
  }

  // Get a list of containers currently being listened //need to print the containers nicely
  async getListenedContainers() {
    try {
      const containers = await this.docker.listContainers({ all: true });
      const containerInfoList = containers.map((container) => {
        if (this.hasContainer(container)) {
          return { id: container.Id, name: container.Names[0] };
        }
      });
      containerInfoList = containerInfoList.filter(
        (element) => element != undefined
      );
      printContainers(containerInfoList);
    } catch (error) {
      console.log(`could not get all listened containers:${error}\n`);
    }
  }

  //print containers by attachment,id,name
  printContainers(containers) {
    let headerSpace = " ".repeat(64 - 15);
    console.log(`ATTACHED  CONTAINER ID ${headerSpace}    CONTAINER NAME`);
    containers.forEach((container) => {
      let attachSpace = " ".repeat(10 - container.att.toString().length);
      let att = container.att;
      let id = container.id;
      let name = container.name.substring(1);
      console.log(`${att}${attachSpace}${id}  ${name}`);
    });
  }
}
// main=async ()=>{
//   let logger=new ContainerManager(dbUrl);
//   await logger.startService();
//   logger.getAllRunningContainers();

// }
// main();

module.exports = ContainerManager;
