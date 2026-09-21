const express = require("express");
const analyticsController = require("../controllers/analyticsController");

const router = express.Router();

// Dynamic pricing prediction
router.post("/pricing/predict", analyticsController.postPredictPrice);

// Listing specific pricing benchmark
router.get("/pricing/home/:homeId", analyticsController.getHomePricingAnalysis);

// Host performance and revenue metrics
router.get("/host/metrics", analyticsController.getHostMetrics);

// Market trends & travel corridor intelligence
router.get("/market/overview", analyticsController.getMarketOverview);

module.exports = router;
