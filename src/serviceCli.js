const storageLayer = require("./storageLayer");
const containerLogger = require("./ContainerLogger");
const yargs = require("yargs");

let  logger;
let storage;
let serviceStatue=false;
//functions
const startService = () => {
  if(isServiceOn()){
    storage = new storageLayer();
    logger = new containerLogger(storageLayer);
    serviceStatue=true;
  }
  else{
    console.log("service is already running");
  }
};
const addContainer = (containerId) => {
  if(isServiceOn()){
    let success = logger.attachToContainer(containerId);
  }
  else{
    console.log("service is off")
  }
};
const removeContainer = (containerId) => {
  if(isServiceOn()){
    logger.detachContainer(containerId);
  }
  else{
    console.log("service is off")
  }
};
const showContainerLog = (containerId) => {
  if(isServiceOn()){
    logger.showContainerLog(containerId);
  }
  else{
    console.log("service is off")
  }
};
const showAllContainers = () => {
  if(isServiceOn()){
    logger.getAllRunningContainers().then((result) => {
      result.forEach((container) => {
        console.log(`id:${container.id}  name:${container.name}`);
      });
    });
  }
  else{
    console.log("service is off")
  }
};
const showListenedContainers = () => {
  if(isServiceOn()){
    logger.getListenedContainers().then((result) => {
      result.forEach((container) => {
        console.log(`id:${container.id}  name:${container.name}`);
      });
    });
  }
  else{
    console.log("service is off")
  }

};
const exit = () => {serviceStatue=false};

const isServiceOn=()=>{return serviceStatue}

yargs.command({
  command: "start",
  describe: "starts the containger logger service",
  handler: () => {
    console.log("the service has started");
    startService();
  },
});
yargs.command({
  command: "stop",
  describe: "stops the containger logger service",
  handler: () => {
    exit();
    console.log("the service has stopped");
  },
});
yargs.command({
  command: "show a",
  describe: "show all running containers on machine",
  handler: () => {
    showAllContainers();
  },
});
yargs.command({
  command: "show l",
  describe: "show all listned containers on machine",
  handler: () => {
    showListenedContainers();
  },
});
yargs.command({
  command: "attach <id>",
  describe: "Listen to container logs by ID",
  handler: (argv) => {
    const containerId = argv.id;
    addContainer(containerId);
  },
});
yargs.command({
  command: "detach <id>",
  describe: "Listen to container logs by ID",
  handler: (argv) => {
    const containerId = argv.id;
    removeContainer(containerId);
    console.log(`Container ${containerId} has stopped being listened to.`);
  },
});
yargs.command({
  command: "log <id>",
  describe: "prints all containers logs",
  handler: (argv) => {
    const containerId = argv.id;
    showContainerLog(containerId);
    console.log(`Container ${containerId} logs`);
  },
});

const argv = yargs.argv;

