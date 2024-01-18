let count = 0;

function logCount() {
  console.log(`Container ID: ${process.env.HOSTNAME}, Count: ${count}`);
  count++;
}

setInterval(logCount, 1000);
