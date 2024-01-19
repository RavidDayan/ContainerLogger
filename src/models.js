const mongoose = require("mongoose");

const logSchema = new mongoose.Schema({
  timestamp: {
    type: Number,
    default: new Date().getTime(),
    required: true,
  },
  containerId: {
    type: String,
    required: true,
  },
  log: {
    type: String,
    required: true,
  },
});
logSchema.index({ containerId: 1, timestamp: 1 }, { unique: true });
const LogModel = mongoose.model("Log", logSchema);

const containerSchema = new mongoose.Schema({
  containerId: {
    type: String,
    required: true,
    unique: true,
  },
});

const ContainerModel = mongoose.model("trackedContainers", containerSchema);

const containerManagerSchema = new mongoose.Schema({
  singleton: {
    type: String,
    default: "singleton",
    unique: true,
  },
  serviceState: {
    type: Boolean,
    default: false,
  },
  saveDate: {
    type: Date,
    default: 0,
  },
});
const ManagerModel = mongoose.model("ContainerManager", containerManagerSchema);

module.exports = { ContainerModel, LogModel, ManagerModel };
