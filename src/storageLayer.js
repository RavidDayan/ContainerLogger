const mongoose = require("mongoose");
const { ContainerModel, LogModel, ManagerModel } = require("./models");

class StorageLayer {
  constructor(urlConnection) {
    this.urlConnection = urlConnection;
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
  async removeContainers(containers) {
    try{
      await containers.forEach(containerId => {
        ContainerModel.deleteOne({containerId:containerId})
     });
    }
    catch(error){
      throw error;//handles by ContainerManager.stopservice/removeContainer
    }
  }

  async addLogs(logs) {
    try {
      const logDocuments = logs.map((log) => {
        return new LogModel({
          containerId: log.containerId,
          log: log.log,
          timestamp: log.timestamp,
        });
      });
      await LogModel.insertMany(logDocuments, { ordered: false });
    } catch (error) {
      throw error;//handled by ContainerManager.addLogsToDb
    }
  }
  async getLogs(containerId, startDate, endDate) {
    if (startDate === undefined) {
      startDate = 0;
    }
    if (endDate === undefined) {
      endDate = new Date().getTime();
    }
    try {
      const containerLogs = await LogModel.find({
        containerId: containerId,
        timestamp: { $gte: startDate, $lte: endDate },
      });
      return containerLogs;
    } catch (error) {
      throw error//handled by ContainerManager.retrieveLogs;
    }
  }
}

module.exports = StorageLayer;
