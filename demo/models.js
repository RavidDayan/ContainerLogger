// storageLayer.js
const mongoose = require("mongoose");

// Define the Log schema
const logSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
  log: {
    type: String,
    required: true,
  },
});

// Create a Mongoose model based on the Log schema
const Log = mongoose.model("Log", logSchema);

// Define the ContainerLog schema
const containerLogSchema = new mongoose.Schema({
  containerId: {
    type: String,
    required: true,
    unique: true,
  },
  logs: [logSchema], // Array of logs using the Log schema
});

// Create a Mongoose model based on the ContainerLog schema
const Container = mongoose.model("ContainerLog", containerLogSchema);

module.exports = { Log, Container };
