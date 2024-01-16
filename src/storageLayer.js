const mongoose = require("mongoose");
const { containerModel, logModel } = require("../demo/models");

class StorageLayer {
  constructor(urlConnection) {
    this.urlConnection=urlConnection;
    this.Connection=null;
    this.isConnected=false
  }
  async connectDb(){
     this.Connection = await mongoose
    .connect(this.urlConnection)
    .then(() => {
      this.isConnected = true;
      console.log("connection successfull");
    })
    .catch((error) => {
      this.isConnected = false;
      console.log(error);
    });
    return this.isConnected;
  }
  disConnectDb(){
    this.Connection.connection.close()
  }
  
  async addContainers(containerId) {
    try {
      const existingContainer = await containerModel.findOne({ containerId });
      if (existingContainer) {
        throw new Error("Container with the given ID already exists");
      }

      const newContainer = new containerModel({ containerId });
      await newContainer.save();

      console.log(`Container with ID ${containerId} created successfully.`);
    } catch (error) {
      console.error(`Error adding container: ${error.message}`);
    }
  }

  async addLog({ containerId, timestamp, log }) {
    try {
      const container = await containerModel.findOne({ containerId });
      if (!container) {
        throw new Error("Container not found");
      }

      const newLog = new logModel({ timestamp, log });
      container.logs.push(newLog);
      await container.save();

      console.log("Log added to the container successfully.");
    } catch (error) {
      console.error(`Error adding log: ${error.message}`);
    }
  }
}

module.exports = StorageLayer;

