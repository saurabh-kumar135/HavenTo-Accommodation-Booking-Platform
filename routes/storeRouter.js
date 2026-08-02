// External Module
const express = require("express");
const storeRouter = express.Router();

const storeController = require("../controllers/storeController");

storeRouter.get("/api", storeController.getIndex);
storeRouter.get("/api/homes", storeController.getHomes);
storeRouter.get("/api/bookings", storeController.getBookings);
storeRouter.post("/api/bookings", storeController.postBooking);
storeRouter.get("/api/favourites", storeController.getFavouriteList);

storeRouter.get("/api/homes/:homeId", storeController.getHomeDetails);
storeRouter.post("/api/favourites", storeController.postAddToFavourite);
storeRouter.post("/api/favourites/delete/:homeId", storeController.postRemoveFromFavourite);

module.exports = storeRouter;
