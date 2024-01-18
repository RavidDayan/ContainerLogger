const Docker = require("dockerode");

class ContainerLog {
  constructor(containerId, data, err, end, manager) {
    try {
      this.docker = new Docker();
      this.manager = manager;
      this.id = containerId;
      this.data = data;
      this.err = err;
      this.end = end;
      this.container = this.docker.getContainer(containerId);
      this.logStream = null;
      this.attachListeners();
    } catch (error) {
      console.log(`container with id ${containerId} does not exist, try again`);
    }
  }
  removeNonPrintableChars(inputString) {
    return inputString.replace(/[^\x20-\x7E]/g, "");
  }
  processLogMessage(logMessage) {
    return this.removeNonPrintableChars(logMessage);
  }
  //wrapper functions to pass the container id to the event listner
  idDataWrapper = (data) => {
    const logMessage = this.processLogMessage(data);
    this.data(this.id, new Date().getTime(), logMessage);
  };
  idErrWrapper = (data) => {
    const logMessage = this.processLogMessage(data);
    this.err(this.id, new Date().getTime(), logMessage);
  };
  idEndWrapper = (data) => {
    const logMessage = this.processLogMessage(data);
    this.end(this.id, new Date().getTime(), logMessage);
  };
  async attachListeners() {
    const currentTime = Math.floor(new Date().getTime() / 1000); // UNIX timestamp in seconds
    let stream = await this.container.logs({
      follow: true,
      stdout: true,
      stderr: true,
      since: currentTime,
    });
    stream.setEncoding("utf8");
    stream.on("data", this.idDataWrapper);
    stream.on("error", this.idErrWrapper);
    stream.on("end", this.idEndWrapper);
    this.logStream = stream;
  }
  removeListeners() {
    this.logStream.removeAllListeners("data");
    this.logStream.removeAllListeners("error");
    this.logStream.removeAllListeners("end");
  }
}

module.exports = ContainerLog;
