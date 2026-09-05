const Listing = require("../models/listing");
const { generateTripPlan } = require("../util/aiClient");

module.exports.renderForm = (req, res) => {
    res.render("trip-planner/form.ejs");
};

module.exports.generatePlan = async (req, res) => {

    const { city, days, budget, people } = req.body;

    if (!city || !days || !budget || !people) {
        req.flash("error", "Please fill in all fields.");
        return res.redirect("/trip-planner");
    }

    const daysNum = Number(days);
    const budgetNum = Number(budget);
    const peopleNum = Number(people);

    // ==========================================
    // Find real listings in your DB that match the city
    // and roughly fit the per-night budget
    // ==========================================

    const perNightBudget = budgetNum / daysNum;

    const matchedListings = await Listing.find({
        $or: [
            { location: { $regex: city, $options: "i" } },
            { country: { $regex: city, $options: "i" } },
        ],
        price: { $lte: Math.max(perNightBudget * 1.3, perNightBudget + 500) },
    })
        .sort({ price: 1 })
        .limit(6);

    // ==========================================
    // Call the AI for the day-by-day itinerary
    // ==========================================

    let plan;

    try {

        plan = await generateTripPlan({
            city,
            days: daysNum,
            budget: budgetNum,
            people: peopleNum,
        });

    } catch (err) {

        console.log("AI Trip Planner error:", err.message);

        req.flash(
            "error",
            "Couldn't generate an AI itinerary right now (" + err.message + "). Showing matched listings below anyway."
        );

        return res.render("trip-planner/results.ejs", {
            plan: null,
            matchedListings,
            searchParams: { city, days: daysNum, budget: budgetNum, people: peopleNum },
        });

    }

    res.render("trip-planner/results.ejs", {
        plan,
        matchedListings,
        searchParams: { city, days: daysNum, budget: budgetNum, people: peopleNum },
    });

};