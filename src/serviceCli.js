const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
let running = true;
let action = 0;

const isActionValid = (action) => {
  if (!isNaN(action)) {
    if (action > 0 && action <= messages[0].length) {
      return true;
    }
  } else {
    return false;
  }
};
async function getUserInput(message) {
  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      resolve(answer);
    });
  });
}
const mainMenu = () => {
  for (let i = 1; i <= messages[0].length; i++) {
    console.log(i + "." + messages[0][i - 1]);
  }
};
const startListening = () => {};
const addContainer = () => {};
const removeContainer = () => {};
const showContainerLog = () => {};
const showAllContainers = () => {};
const showListenedContainers = () => {};
const exit = () => {
  console.log("Program closing...");
  running = false;
  rl.close();
};
const messages = [
  [
    "Start listening",
    "Add a new container",
    "Remove container",
    "show Containers log",
    "Exit",
  ],
  [startListening, addContainer, removeContainer, showContainerLog, exit],
];
const startProgram = async () => {
  while (running) {
    mainMenu();
    action = await getUserInput("please choose action number: ");
    while (!isActionValid(action)) {
      action = await getUserInput("please choose valid action number: ");
    }
    action = parseInt(action);
    messages[1][action - 1]();
  }
};

startProgram();