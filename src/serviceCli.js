const containerLogger = require("./ContainerManager");
const yargs = require("yargs");
const { dbUrl } = require("./config");
let logger;

const argv = yargs;

const startService = () => {
  logger = new containerLogger(dbUrl);
  logger.startService();
};
const addContainer = (containerId) => {
  logger.attachToContainer(containerId);
};
const removeContainer = (containerId) => {
  logger.detachContainer(containerId);
};
const showContainerLog = (containerId) => {
  logger.retrieveLogs(containerId);
};
//done
const showAllContainers = () => {
  logger.getAllRunningContainers();
};
//done
const showListenedContainers = () => {
  logger.getListenedContainers();
};
const exit = async () => {
  await logger.stopService();
  process.exit();
};

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
  command: "show-a",
  aliases: ["a"],
  describe: "show all running containers on machine",
  handler: () => {
    showAllContainers();
  },
});
yargs.command({
  command: "show-l",
  aliases: ["l"],
  describe: "show all listened containers on machine",
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

function serviceCli() {
  console.log(
    'Welcome to container logger service! Type a command or "exit" to quit.'
  );
  function getUserInput() {
    process.stdout.write("> ");
    process.stdin.once("data", (input) => {
      let command = input.toString().trim();
      yargs.parse(command);
      getUserInput();
    });
  }
  getUserInput();
}

serviceCli();
