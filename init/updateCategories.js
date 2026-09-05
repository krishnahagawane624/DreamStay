const mongoose = require("mongoose");
const Listing = require("../models/listing");

const MONGO_URL = process.env.MONGO_URL;

async function main() {
    await mongoose.connect(MONGO_URL);
    console.log("Connected to DB");
}

main()
.then(() => updateCategories())
.catch(err => console.log(err));

async function updateCategories() {

    const updates = [

        { title: "Modern Loft in Downtown", category: "City" },
        { title: "Island Retreat", category: "Beach" },
        { title: "Charming Cottage in the Cotswolds", category: "Forest" },
        { title: "Historic Brownstone in Boston", category: "City" },
        { title: "Beachfront Bungalow in Bali", category: "Beach" },
        { title: "Mountain View Cabin in Banff", category: "Mountain" },
        { title: "Art Deco Apartment in Miami", category: "City" },
        { title: "Tropical Villa in Phuket", category: "Beach" },
        { title: "Historic Castle in Scotland", category: "Heritage" },
        { title: "Desert Oasis in Dubai", category: "Desert" },
        { title: "Rustic Log Cabin in Montana", category: "Forest" },
        { title: "Beachfront Villa in Greece", category: "Beach" },
        { title: "Eco-Friendly Treehouse Retreat", category: "Forest" },
        { title: "Historic Cottage in Charleston", category: "Heritage" },
        { title: "Modern Apartment in Tokyo", category: "City" },
        { title: "Lakefront Cabin in New Hampshire", category: "Lake" },
        { title: "Luxury Villa in the Maldives", category: "Luxury" },
        { title: "Ski Chalet in Aspen", category: "Snow" },
        { title: "Secluded Beach House in Costa Rica", category: "Beach" }

    ];

    for (let item of updates) {

        await Listing.updateOne(
            { title: item.title },
            { $set: { category: item.category } }
        );

    }

    console.log("✅ Categories Updated Successfully");

    mongoose.connection.close();
}