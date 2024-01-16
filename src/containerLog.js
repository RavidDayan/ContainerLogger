const Docker = require("dockerode");

class ContainerLog {
  static Docker = new Docker();

  constructor(containerId, data, err, end, manager) {
    this.container = ContainerLog.Docker.getContainer(containerId);
    this.manager = manager;
    this.id = containerId;
    this.data = data;
    this.err = err;
    this.end = end;
    this.logStream = null;
    this.attachListeners();
  }
  processLogMessage(logMessage) {
    const firstNewlineIndex = logMessage.indexOf("\n");
    const secondNewlineIndex = logMessage.indexOf("\n", firstNewlineIndex + 1);
    if (firstNewlineIndex !== -1 && secondNewlineIndex !== -1) {
      const extractedMessage = logMessage
        .substring(firstNewlineIndex + 1, secondNewlineIndex)
        .trim();
      return extractedMessage;
    }
    return logMessage;
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
    stream.on("error", this.err);
    stream.on("end", this.end);
    this.logStream = stream;
  }
  removeListeners() {
    this.logStream.removeAllListeners("data");
    this.logStream.removeAllListeners("error");
    this.logStream.removeAllListeners("end");
  }
}

module.exports = ContainerLog;
