require("dotenv").config();

const mongoose = require("mongoose");
const Listing = require("./models/listing");
const User = require("./models/user");

const MONGO_URL = process.env.MONGO_URL;
async function main() {
    await mongoose.connect(MONGO_URL);
    console.log("Connected to DB");

    // Get the first user (or your user)
    const user = await User.findOne();

    if (!user) {
        console.log("No user found!");
        return process.exit();
    }

    const listings = await Listing.find();

    for (let listing of listings) {

        // Add owner if missing
        if (!listing.owner) {
            listing.owner = user._id;
        }

        // Add geometry if missing
        if (
            !listing.geometry ||
            !listing.geometry.coordinates ||
            listing.geometry.coordinates.length === 0
        ) {
            listing.geometry = {
                type: "Point",
                coordinates: [73.8567, 18.5204], // Pune
            };
        }

        await listing.save();
    }

    console.log("All listings updated successfully.");
    process.exit();
}

main().catch(console.error);