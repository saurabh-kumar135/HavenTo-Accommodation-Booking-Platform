// External Module
const express = require("express");
const hostRouter = express.Router();

const hostController = require("../controllers/hostController");

hostRouter.get("/api/host/add-home", hostController.getAddHome);
hostRouter.post("/api/host/add-home", hostController.postAddHome);
hostRouter.get("/api/host/host-home-list", hostController.getHostHomes);
hostRouter.get("/api/host/edit-home/:homeId", hostController.getEditHome);
hostRouter.post("/api/host/edit-home", hostController.postEditHome);
hostRouter.post("/api/host/delete-home/:homeId", hostController.postDeleteHome);

// REST /api/host/homes aliases for parity with FastAPI backend
hostRouter.get("/api/host/homes", hostController.getHostHomes);
hostRouter.post("/api/host/homes", hostController.postAddHome);
hostRouter.post("/api/host/homes/edit", hostController.postEditHome);
hostRouter.get("/api/host/homes/:homeId", hostController.getEditHome);
hostRouter.post("/api/host/homes/delete/:homeId", hostController.postDeleteHome);

module.exports = hostRouter;
