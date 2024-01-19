const mongoose = require("mongoose");
const { ContainerModel, LogModel, ManagerModel } = require("./models");
const { dbPathway } = require("./config");
class StorageLayer {
  constructor() {
    this.urlConnection = dbPathway;
    this.Connection = mongoose;
    this.isConnected = false;
  }
  //connects/disconnects to database server
  async connectDb() {
    try {
      console.log("\nconnecting to database...");
      await this.Connection.connect(this.urlConnection);
      this.isConnected = true;
      console.log("\nservice is connected to database");
    } catch (error) {
      this.isConnected = false;
      console.log(`\nunable to connect to data base:\n${error}`);
    } finally {
      return this.isConnected;
    }
  }
  disconnectDb() {
    this.Connection.connection.close();
    console.log("\ndatabase disconnected successfully");
    this.isConnected = false;
    return this.isConnected;
  }

  async getServiceState() {
    try {
      let state = await ManagerModel.find({ singleton: "singleton" });
      return state;
    } catch (error) {
      throw error; //ContainerManagaer.startService will handle it
    }
  }
  async setServiceState(state) {
    try {
      await ManagerModel.findOneAndUpdate(
        { singleton: "singleton" },
        { serviceState: state }
      );
    } catch (error) {
      throw error; //ContainerManagaer.startService will handle it
    }
  }
  async addContainer(containerId) {
    try {
      const existingContainer = await ManagerModel.findOne({ containerId });
      if (existingContainer) {
        throw new Error("Container with the given ID already exists");
      }
      const newContainer = new ContainerModel({ containerId });
      await newContainer.save();
    } catch (error) {
      throw error; //handled by ContainerManagaer.attachToContainer
    }
  }
  async getContainers() {
    try {
      return await ContainerModel.find(); //return all containers
    } catch (error) {
      throw error;
    }
  }
  //gets a array of container id and removes them one by one from db
  async removeContainers(containers) {
    try {
      containers.forEach(async (containerId) => {
        await ContainerModel.deleteOne({ containerId: containerId });
      });
    } catch (error) {
      throw error; //handles by ContainerManager.stopservice/removeContainer
    }
  }
  async getRecentLogDate(countainerId) {
    try {
      const timestamp = await LogModel.findOne({
        containerId: countainerId,
      }).sort({ timestamp: -1 });
      return timestamp;
    } catch (error) {
      throw error;
    }
  }
  async addLogs(logs) {
    const logDocuments = logs.map((log) => {
      return new LogModel({
        timestamp: log.timestamp,
        containerId: log.containerId,
        log: log.log,
      });
    });
    logDocuments.forEach(async (log) => {
      try {
        log.save();
      } catch (error) {
        try {
          log.findOneAndUpdate({
            containerId: log.containerId,
            timestamp: log.timestamp,
          });
        } catch (error) {
          console.log(
            `\ncould not save container:${log.containerId} timestamp:${log.timestamp}`
          );
        }
      }
    });
  }

  async getLogs(containerId, startDate, endDate) {
    try {
      let containerLogs = await LogModel.find({
        containerId: containerId,
      }).exec();
      containerLogs = containerLogs.map((log) => {
        if (log.timestamp >= startDate && log.timestamp <= endDate) {
          return log;
        }
      });
      containerLogs = containerLogs.filter((log) => {
        return log != undefined;
      });
      return containerLogs;
    } catch (error) {
      console.log(error); //handled by ContainerManager.retrieveLogs;
    }
  }
}

module.exports = StorageLayer;
