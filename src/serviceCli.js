const containerLogger = require("./ContainerManager");
const yargs = require("yargs");
const { dbUrl } = require("./config");
let logger;
const customUsage = `
Custom help message:
---------------------
exit - Stops the container logger service
show-a - Show all running containers on machine
show-l - Show all listened containers on machine
attach <id> - Listen to container logs by ID
detach <id> - Stop listening to container logs by ID
log <id> [startDate] [endDate] - Print container logs by date

Log command usage:
---------------------
log <id> - Print all logs for the specified container ID from the beginning.
log <id> <startDate> - Print logs for the specified container ID from the provided start date to the current date.
log <id> <startDate> <endDate> - Print logs for the specified container ID within the provided date range.
---------------------
`;

const argv = yargs;

// Handle help event exiting
yargs.wrap(null).exitProcess(false);


const addContainer = (containerId) => {
  logger.attachToContainer(containerId);
};
const removeContainer = (containerId) => {
  logger.detachContainer(containerId);
};
const showContainerLog = (containerId, startDate, endDate) => {
  logger.retrieveLogs(containerId, startDate, endDate);
};
const showAllContainers = () => {
  logger.getAllRunningContainers();
};
const showListenedContainers = () => {
  logger.getListenedContainers();
};
const exit = async () => {
  await logger.stopService();
  process.exit();
};

// yargs.command({
//   command: "start",
//   describe: "starts the containger logger service",
//   handler: () => {
//     console.log("the service has started");
//     startService();
//   },
// });
yargs.command({
  command: "exit",
  describe: "stops the containger logger service",
  handler: () => {
    console.log("the service has stopped");
    exit();
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
  command: "log <id> [startDate] [endDate]",
  describe:
    'prints all containers logs by date\ndate format: "yyyy-mm-dd hh-mm-ss"\nfor all logs: log <id> \nfor all logs from start to date: log log <id> 0 <endDate> ',
  handler: (argv) => {
    const containerId = argv.id;
    let startDate = argv.startDate;
    let endDate = argv.endDate;
    showContainerLog(containerId, startDate, endDate);
  },
});

async function serviceCli() {

  logger = new containerLogger();
  await logger.startService();
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
