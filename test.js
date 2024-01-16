const { spawn } = require('child_process');

const containerId = '49ad76a17ceb8427e6b1c9da74fa6a91f6348690a8a957e09ff22b6b80a65041';

// Function to attach event listeners to the log stream
function attachListeners(logStream) {
  logStream.on('data', onData);
  logStream.on('end', onEnd);
  logStream.on('error', onError);
}

// Function to remove event listeners from the log stream
function removeListeners(logStream) {
  logStream.removeListener('data', onData);
  logStream.removeListener('end', onEnd);
  logStream.removeListener('error', onError);
}

// Event handler for data
function onData(data) {
  console.log(data);
}

// Event handler for stream end
function onEnd() {
  console.log('Log stream ended.');
}

// Event handler for stream error
function onError(err) {
  console.error(`Error in log stream: ${err.message}`);
}

// Spawn the docker logs command to get a log stream
const logStream = spawn(`docker logs -f ${containerId}`, { shell: true });

// Set encoding to UTF-8
logStream.stdout.setEncoding('utf8');

// Attach listeners
attachListeners(logStream.stdout);

// Log for 5 seconds
setTimeout(() => {
  // Remove listeners after 5 seconds
  removeListeners(logStream.stdout);
  console.log('stopped')

  // Stop the log stream
  logStream.kill();
}, 5000);
