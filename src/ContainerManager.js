const Docker = require("dockerode");
const Storage = require("./storageLayer");
const { batchLimit,timeLimit dbUrl } = require("./config");
const Container = require("./containerLog");
const Log = require("./log");

class ContainerManager {
  constructor(dbUrlConnection) {
    this.docker = new Docker(); // Instantiate Docker instance
    this.dbUrlConnection = dbUrlConnection;
    // this.Storage=null;
    this.containers = [];
    this.logsBatch = [];
    this.service;
    this.timeLimit=0;
    startTimeLimitCounter();
  }
  //counts up to the limit until next batch sending
  startTimeLimitCounter() {
    this.intervalId = setInterval(() => {
      this.timeLimit++;
      if (this.timeLimit > timeLimit) {
        sendLogsToStorageLayer();
        clearInterval(this.intervalId);
        this.timeLimit=0;
        this.startCounter();
      }
    }, 1000);
  }

  //add container to containers returns true if added else false
  addContainer(container) {
    this.containers.forEach((stored) => {
      if (container.id === stored.id) {
        return false;
      }
    });
    this.containers.push(container);
    return true;
  }
  //removes container from containers returns true if removed else false
  removeContainer(container) {
    for (let i = 0; i < this.containers.length; i++) {
      if (container.id === this.containers[i].id) {
        this.containers.splice(i, 1);
        return true;
      }
    }
    return false;
  }
  //pops container from containers returns container if exists else false
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
      let smallerId = container.Id;
      if (smallerId === this.containers[i].id) {
        return true;
      }
    }
    return false;
  }
  // Attach to a container
  attachToContainer(containerId) {
    //get Container
    const container = new Container(
      containerId,
      this.logHandler,
      this.logHandler,
      this.logHandler,
      this
    );
    return this.addContainer(container);
  }
  detachContainer(containerId) {
    const detachedContainer = this.popContainer(
      this.docker.getContainer(containerId)
    );
    if (detachedContainer) {
      detachedContainer.removeListeners();
      return true;
    } else {
      return false;
    }
  }

  //event listeners for logs
  logHandler = (containerId, timeStamp, data) => {
    const logObject = new Log(containerId, timeStamp, data);
    this.logsBatch.push(logObject);
    if (this.logsBatch.length > batchLimit) {
    }
  };
  sendLogsToStorageLayer = () => {
    const storage = new Storage(dbUrlConnection);
    if (storage.connectDb()) {
    }
    storage.disconnectDb();
  };
  // start the logging service
  startService() {
    // // Check if the service is already running
    // if (this.storage.serviceOn()) {
    //   console.log('Logging service is already running.');
    //   return false;
    // }

    // Start the service in the storage layer
    // this.storage.startService();
    console.log("Logging service started.");
    return true;
  }
  // Stop the logging service
  stopService() {
    // Remove event listeners from all containers in the set
    this.containers.forEach((containerInfo) => {
      const container = this.docker.getContainer(containerInfo.containerId);

      // Remove all event listeners for the 'data' and 'end' events
      container.removeAllListeners("data");
      container.removeAllListeners("end");
    });

    // Stop the service in the storage layer
    this.storage.stopService();
    console.log("Logging service stopped.");
    return true;
  }

  sendLogs() {}
  // Retrieve logs for a container
  retrieveLogs(containerId) {
    const logs = this.storage.getLogs(containerId);
    console.log(`Logs for container ${containerId}:`);
    console.log(logs);
  }

  // Get a list of all running containers
  async getAllRunningContainers() {
    const containers = await this.docker.listContainers({ all: true });
    const containerInfoList = containers.map((container) => {
      return { id: container.Id, name: container.Names[0] };
    });
    return containerInfoList;
  }

  // Get a list of containers currently being listened to
  async getListenedContainers() {
    const containers = await this.docker.listContainers({ all: true });
    const containerInfoList = containers.map((container) => {
      if (this.hasContainer(container)) {
        return { id: container.Id, name: container.Names[0] };
      }
    });
    return containerInfoList.filter((element) => element != undefined);
  }
}

module.exports = ContainerManager;
async function main() {
  logger = new ContainerManager(dbUrl);

  logger.attachToContainer(
    "49ad76a17ceb8427e6b1c9da74fa6a91f6348690a8a957e09ff22b6b80a65041"
  );
  setTimeout(async () => {
    console.log(await logger.getListenedContainers());
  }, 4000);
  setTimeout(() => {
    console.log("starting detach");
    logger.detachContainer(
      "49ad76a17ceb8427e6b1c9da74fa6a91f6348690a8a957e09ff22b6b80a65041"
    );
  }, 5000);
  setTimeout(() => {
    console.log(logger.logsBatch);
  }, 7000);
}

main();
