const Docker = require("dockerode");

class ContainerLog {
  constructor(containerId, data, err, end, manager, since) {
    try {
      this.docker = new Docker();
      this.manager = manager;
      this.id = containerId;
      this.data = data;
      this.err = err;
      this.end = end;
      this.container = this.docker.getContainer(containerId);
      this.logStream = null;
      this.attachListeners(since);
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
    let timestamp = data.substring(8, 38);
    const unixTimestamp = new Date(timestamp).getTime();
    let logmessage = data.substring(39);
    this.data(this.id, unixTimestamp, logmessage);
  };
  idErrWrapper = (data) => {
    console.log(data);
    let timestamp = data.substring(8, 38);
    const unixTimestamp = new Date(timestamp).getTime();
    let logmessage = data.substring(39);
    this.data(this.id, unixTimestamp, logmessage);
  };
  idEndWrapper = (data) => {
    let timestamp = data.substring(8, 38);
    const unixTimestamp = new Date(timestamp).getTime();
    let logmessage = data.substring(39);
    this.data(this.id, unixTimestamp, logmessage);
  };
  async attachListeners(since) {
    if (since === undefined) {
      since = new Date().getTime() / 1000;
    } else {
      since = new Date(since).getTime() / 1000;
    }
    let stream = await this.container.logs({
      follow: true,
      stdout: true,
      stderr: true,
      since: since,
      timestamps: true,
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
