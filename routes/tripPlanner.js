const express = require("express");
const router = express.Router();

const wrapAsync = require("../util/wrapAsync");
const tripPlannerController = require("../controllers/tripPlanner");
const { isLoggedIn } = require("../middleware");

router.get(
    "/",
    isLoggedIn,
    tripPlannerController.renderForm
);

router.post(
    "/",
    isLoggedIn,
    wrapAsync(tripPlannerController.generatePlan)
);

module.exports = router;