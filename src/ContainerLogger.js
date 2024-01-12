const Docker = require('dockerode');

class ContainerLogger {
  constructor(storage) {
    this.docker = new Docker(); // Instantiate Docker instance
    this.storage = storage;
    this.containers = new Set(); // Set to keep track of containers (storing objects with id and name)
  }

  // Attach to a container
  attachToContainer(containerId) {
    // Check if the container ID already exists in the set
    if (this.containers.has(containerId)) {
      console.log(`Container ${containerId} is already being logged.`);
      return false;
    }

    // Fetch and store container info for later use
    this.fetchAndStoreContainerInfo(containerId);

    const container = this.docker.getContainer(containerId);

    container.logs({ follow: true, stdout: true, stderr: true }, (err, stream) => {
      if (err) {
        console.error(`Error attaching to container ${containerId}: ${err.message}`);
        return;
      }

      stream.setEncoding('utf8');
      stream.on('data', (chunk) => {
        this.storage.saveLog(containerId, chunk);
      });

      stream.on('end', () => {
        console.log(`Log stream for container ${containerId} closed.`);
        // Perform any cleanup or additional actions if needed

        // Optionally, remove the container information from the set when the stream ends
        this.containers.delete(containerId);
      });
    });

    // Return true to indicate that the container was added and logged
    return true;
  }
  detachContainer(containerId) {
    // Check if the container ID exists in the set
    if (!this.containers.has(containerId)) {
      console.log(`Container ${containerId} not found in the list.`);
      return false;
    }
  
    // Remove the container information from the set
    this.containers.delete(containerId);
  
    // Remove event listeners from the detached container
    const detachedContainer = this.docker.getContainer(containerId);
    detachedContainer.removeAllListeners('data');
    detachedContainer.removeAllListeners('end');
  
    console.log(`Detached from container ${containerId}.`);
    return true;
  }
// start the logging service
  startService() {
    // Check if the service is already running
    if (this.storage.serviceOn()) {
      console.log('Logging service is already running.');
      return false;
    }

    // Start the service in the storage layer
    this.storage.startService();
    console.log('Logging service started.');
    return true;
  }
  // Stop the logging service
  stopService() {
    // Remove event listeners from all containers in the set
    this.containers.forEach((containerInfo) => {
      const container = this.docker.getContainer(containerInfo.containerId);
      
      // Remove all event listeners for the 'data' and 'end' events
      container.removeAllListeners('data');
      container.removeAllListeners('end');
    });

    // Stop the service in the storage layer
    this.storage.stopService();
    console.log('Logging service stopped.');
    return true;
  }

  // Retrieve logs for a container
  retrieveLogs(containerId) {
    const logs = this.storage.getLogs(containerId);
    console.log(`Logs for container ${containerId}:`);
    console.log(logs);
  }

  // Get a list of all running containers
  getAllRunningContainers() {
    // Convert the set to an array for consistent output
    const containersArray = Array.from(this.containers);

    const containerInfoList = containersArray.map((containerInfo) => ({
      containerId: containerInfo.containerId,
      containerName: containerInfo.containerName,
    }));

    return containerInfoList;
  }

  // Get a list of containers currently being listened to
  getListenedContainers() {
    // Convert the set to an array for consistent output
    const containersArray = Array.from(this.containers);

    const containerInfoList = containersArray.map((containerInfo) => ({
      containerId: containerInfo.containerId,
      containerName: containerInfo.containerName,
    }));

    return containerInfoList;
  }

  // Helper method to fetch and store container information
  fetchAndStoreContainerInfo(containerId) {
    this.docker.getContainer(containerId).inspect((err, data) => {
      if (err) {
        console.error(`Error fetching container info for ${containerId}: ${err.message}`);
        return;
      }

      const containerInfo = {
        containerId,
        containerName: data.Name.substring(1), // Remove the leading '/'
        // You may store additional information as needed
      };

      // Store the entire container information object in the set
      this.containers.add(containerInfo);
    });
  }
}

module.exports = ContainerLogger;
