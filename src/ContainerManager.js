const Docker = require("dockerode");
const { batchLimit, timeLimit, influx } = require("./config");
const Storage = require("./storageLayer");
const Container = require("./containerLog");
const Log = require("./log");

class ContainerManager {
  constructor() {
    this.docker = new Docker();
    this.storage = new Storage();
    this.containers = [];
    this.logsBatch = [];
    this.service = false;
    this.timeLimit = 0;
  }

  //timer limit counter for log sending to db
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
        this.timeLimit = 0;
        this.startCounter();
      }
    }, 1000);
  }
  //basic add/remove/pop/has ,compare by container id.
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
  // Attach/detach  to a container and get logs
  async attachToContainer(containerId, since) {
    try {
      await this.doesContainerExist(containerId); //check if container with the id exists
      const container = new Container( //create new container
        containerId,
        this.logHandler,
        this.logHandler,
        this.logHandler,
        this,
        since
      );
      await this.storage.addContainer(containerId); //add id to listned containers
      this.logsBatch.push(
        new Log(
          containerId,
          new Date().getTime(),
          `started listening to container ${containerId}`
        )
      );
      this.addLogsToDb();
      this.addContainer(container); //add refrence to managers container array
      console.log(
        `\ncontainer ${containerId} \n has been successfully attached\n`
      );
    } catch (error) {
      console.log(`\ncould not attach container ${containerId}:\n${error}\n`);
    }
  }
  async doesContainerExist(containerId) {
    try {
      let doesExist = false;
      const containers = await this.docker.listContainers({ all: true });
      containers.forEach((container) => {
        if (container.Id === containerId) {
          doesExist = true;
        }
      });
      if (!doesExist) {
        const error = new Error(
          `container with id ${containerId} does not exist, try again`
        );
        throw error;
      }
      return true;
    } catch (error) {
      throw error;
    }
  }
  async detachContainer(containerId) {
    try {
      await this.storage.removeContainers([containerId]);
      const detachedContainer = this.popContainer(
        this.docker.getContainer(containerId)
      );
      detachedContainer.removeListeners();
      console.log(
        `\ncontainer ${containerId} \n has been successfully detached\n`
      );
    } catch (error) {
      console.log(`\ncould not detach container ${containerId}:\n${error}\n`);
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
      await this.storage.addLogs(currentBatch);
      this.removeSavedLogs(currentBatch, this.logsBatch);
    } catch (error) {
      console.log(`\ncould not store logs :\n${error}\n`);
    }
  };
  async retrieveLogs(containerId, startDate, endDate) {
    await this.addLogsToDb();
    try {
      startDate = this.convertToUnixTimeStamp(startDate, "start");
      endDate = this.convertToUnixTimeStamp(endDate, "end");
      if (startDate > endDate) {
        throw new Error();
      }
      const logs = await this.storage.getLogs(containerId, startDate, endDate);
      this.printLogs(containerId, logs);
    } catch (error) {
      console.log(
        "\ntimes entered are not valid, please enter diffrent times for logs\n"
      );
    }
  }
  //convert iso timestamp to unixtimestamp
  convertToUnixTimeStamp(time, indicator) {
    if (indicator === "start" && time === undefined) {
      return 0;
    }
    if (indicator != "start" && time === undefined) {
      return new Date().getTime() + influx;
    }
    try {
      if (this.isUnixTimestamp(time)) {
        time = time.substring(1, time.length - 1);
        return new Date(time).getTime() + influx;
      } else {
        throw new Error();
      }
    } catch (error) {
      throw err;
    }
  }
  isUnixTimestamp(dateToCheck) {
    const timestamp = parseInt(
      dateToCheck.substring(1, dateToCheck.length - 1),
      10
    );

    if (isNaN(timestamp)) {
      return false;
    }
    const date = new Date(timestamp);

    return !isNaN(date.getTime());
  }
  printLogs(containerId, logs) {
    let headerSpace = " ".repeat(15);
    console.log(`\nLogs for container ${containerId}:`);
    console.log(`\nDATE ${headerSpace} LOG `);
    logs.forEach((log) => {
      let timeStamp = this.formatTimestamp(log.timestamp);
      let message = log.log.trim();
      console.log(`${timeStamp}  ${message}`);
    });
  }
  //convert unix timestamp to iso
  formatTimestamp(timestamp) {
    const isoFormat = new Date(timestamp).toISOString();
    const formattedDate = isoFormat.replace("T", " ").replace(/\.\d{3}Z$/, "");
    return formattedDate;
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
    await this.storage.connectDb();
    if (await this.storage.getServiceState()) {
      console.log(
        "\nit seems like the service has not shut down properly,retrieving running containers and recovring missed logs\n"
      );
      await this.fixServiceCrash();
    }
    await this.storage.setServiceState(true);
    this.service = true;
    this.startCounter();
  }

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
  async fixServiceCrash() {
    try {
      const runningContainers = await this.storage.getContainers(); //get all containers that didnt shut off
      runningContainers.forEach(async (container) => {
        const timestamp = await this.storage.getRecentLogDate(
          container.containerId
        );
        if (timestamp == null) {
          timestamp.timestamp = new Date().getTime();
        }
        //get the most recent logdate of each one
        await this.storage.removeContainers([container.containerId]); //remove the container from db
        await this.attachToContainer(
          container.containerId,
          timestamp.timestamp + 1001
        ); //make new container and reattach with the next log
      });
    } catch (error) {
      throw error;
    }
  }
  // Get a list of all running containers//need to print the containers nicely
  async getAllRunningContainers() {
    try {
      const containers = await this.docker.listContainers();
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
      const containers = await this.docker.listContainers();
      let containerInfoList = containers.map((container) => {
        if (this.hasContainer(container)) {
          return { att: true, id: container.Id, name: container.Names[0] };
        } else {
          return { att: false, id: container.Id, name: container.Names[0] };
        }
      });
      containerInfoList = containerInfoList.filter(
        (container) => container.att == true
      );
      this.printContainers(containerInfoList);
    } catch (error) {
      console.log(`could not get all listened containers:${error}\n`);
    }
  }

  //print containers by attachment,id,name
  printContainers(containers) {
    let headerSpace = " ".repeat(64 - 15);
    console.log(`\nATTACHED  CONTAINER ID ${headerSpace}    CONTAINER NAME`);
    containers.forEach((container) => {
      let attachSpace = " ".repeat(10 - container.att.toString().length);
      let att = container.att;
      let id = container.id;
      let name = container.name.substring(1);
      console.log(`${att}${attachSpace}${id}  ${name}`);
    });
  }
}

module.exports = ContainerManager;
