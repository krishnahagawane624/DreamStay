const Listing = require("../models/listing");
const Review = require("../models/review");
const User = require("../models/user");
const { cloudinary } = require("../cloudConfig");
const ExpressError = require("../util/ExpressError");
const getCoordinates = require("../util/location");
const { generateListingDescription, generateImageCaption } = require("../util/aiClient");
const { AMENITIES_CATALOG, resolveAmenities } = require("../util/amenitiesCatalog");
const Booking = require("../models/booking");
const crypto = require("crypto");

// ==========================================
// AI IMAGE CAPTIONING + FRAUD DETECTION HELPERS
// ==========================================

// Downloads the uploaded image bytes from its Cloudinary URL and hashes them.
// Used to spot the exact same photo being reused across different listings.
async function hashImageFromUrl(url) {

    try {

        const response = await fetch(url);

        if (!response.ok) return "";

        const buffer = Buffer.from(await response.arrayBuffer());

        return crypto.createHash("sha256").update(buffer).digest("hex");

    } catch (err) {

        console.log("Image hashing failed:", err.message);
        return "";

    }

}

// Runs captioning + hashing for every uploaded file, in parallel.
async function processUploadedImages(files) {

    return Promise.all(
        (files || []).map(async (file) => {

            let caption = "";

            try {
                caption = (await generateImageCaption(file.path)) || "";
            } catch (err) {
                console.log("Image captioning failed:", err.message);
            }

            const imageHash = await hashImageFromUrl(file.path);

            return {
                url: file.path,
                filename: file.filename,
                caption,
                imageHash,
            };

        })
    );

}

// Checks whether any of the newly uploaded images already exist (by hash)
// on some OTHER owner's listing — a strong signal of a copied/scam listing.
async function detectFraud(uploadedImages, { excludeListingId, ownerId }) {

    const hashes = uploadedImages.map(img => img.imageHash).filter(Boolean);

    if (hashes.length === 0) {
        return { flagged: false, message: "", matchedListing: null };
    }

    const query = {
        owner: { $ne: ownerId },
        "images.imageHash": { $in: hashes },
    };

    if (excludeListingId) {
        query._id = { $ne: excludeListingId };
    }

    const match = await Listing.findOne(query).select("title owner");

    if (match) {

        return {
            flagged: true,
            message: `One or more of these photos already appear on another listing ("${match.title}"). This may be a duplicate or fraudulent listing — please review before it goes live.`,
            matchedListing: match._id,
        };

    }

    return { flagged: false, message: "", matchedListing: null };

}

// ==========================================
// AMENITIES SANITIZATION
// Keeps only amenity IDs that actually exist in the catalog — guards
// against a tampered form submission injecting arbitrary values.
// ==========================================

const VALID_AMENITY_IDS = new Set(AMENITIES_CATALOG.map(a => a.id));

function sanitizeAmenities(rawAmenities) {

    const list = Array.isArray(rawAmenities) ? rawAmenities : (rawAmenities ? [rawAmenities] : []);

    return [...new Set(list)].filter(id => VALID_AMENITY_IDS.has(id));

}


// INDEX ROUTE
module.exports.index = async (req, res) => {

    const { search, category, minPrice, maxPrice, minRating, sort } = req.query;

    let filter = {};

    if (search && search.trim() !== "") {

        filter.$or = [
            { title: { $regex: search, $options: "i" } },
            { location: { $regex: search, $options: "i" } },
            { country: { $regex: search, $options: "i" } },
        ];

    }

    if (category) {
        filter.category = category;
    }

    // ==========================
    // Price Range Filter
    // ==========================

    if (minPrice || maxPrice) {

        filter.price = {};

        if (minPrice && !isNaN(minPrice)) {
            filter.price.$gte = Number(minPrice);
        }

        if (maxPrice && !isNaN(maxPrice)) {
            filter.price.$lte = Number(maxPrice);
        }

    }

    let allListings = await Listing.find(filter)
        .populate("reviews");

    // ==========================
    // Minimum Rating Filter
    // (computed from reviews, so applied after the DB query)
    // ==========================

    if (minRating && !isNaN(minRating)) {

        const minRatingNum = Number(minRating);

        allListings = allListings.filter((listing) => {

            if (!listing.reviews || listing.reviews.length === 0) {
                return false;
            }

            const avg =
                listing.reviews.reduce((sum, review) => sum + review.rating, 0) /
                listing.reviews.length;

            return avg >= minRatingNum;

        });

    }

    // ==========================
    // Sorting
    // ==========================

    const getAvgRating = (listing) => {

        if (!listing.reviews || listing.reviews.length === 0) {
            return 0;
        }

        return (
            listing.reviews.reduce((sum, review) => sum + review.rating, 0) /
            listing.reviews.length
        );

    };

    if (sort === "price_asc") {

        allListings.sort((a, b) => a.price - b.price);

    } else if (sort === "price_desc") {

        allListings.sort((a, b) => b.price - a.price);

    } else if (sort === "rating") {

        allListings.sort((a, b) => getAvgRating(b) - getAvgRating(a));

    } else {

        // Default: newest first (Mongo ObjectIds are chronologically sortable)
        allListings.sort((a, b) => b._id.toString().localeCompare(a._id.toString()));

    }

    let wishlist = [];

    if (req.user) {

    const user = await User.findById(req.user._id);

    wishlist = user.wishlist.map(id => id.toString());

}

    // ==========================
    // Recommended For You
    // Personalized picks based on the user's wishlist, past bookings,
    // and recently viewed listings this session — separate from the
    // "similar listings" shown on an individual listing's page.
    // ==========================

    let recommendedListings = [];

    if (req.user) {

        recommendedListings = await getRecommendedListings(req);

    }

    res.render("listings/index.ejs", {

        allListings,

        search,

        category,

        wishlist,

        minPrice,

        maxPrice,

        minRating,

        sort,

        recommendedListings,

    });

};

// ==========================================
// Builds a preference profile (favourite categories/countries) from a
// user's wishlist, confirmed bookings, and recently viewed listings, then
// scores every other listing against that profile.
// ==========================================

async function getRecommendedListings(req) {

    const user = await User.findById(req.user._id).populate("wishlist");

    const bookings = await Booking.find({
        user: req.user._id,
        status: "confirmed",
    }).populate("listing");

    const recentIds = req.session.recentListings || [];

    const recentListings = await Listing.find({
        _id: { $in: recentIds },
    });

    // Gather the "signal" listings that hint at this user's taste
    const signalListings = [
        ...(user.wishlist || []),
        ...bookings.map(b => b.listing).filter(Boolean),
        ...recentListings,
    ];

    if (signalListings.length === 0) {
        return [];
    }

    // Build frequency profile
    const categoryCount = {};
    const countryCount = {};

    signalListings.forEach((listing) => {

        if (listing.category) {
            categoryCount[listing.category] = (categoryCount[listing.category] || 0) + 1;
        }

        if (listing.country) {
            countryCount[listing.country] = (countryCount[listing.country] || 0) + 1;
        }

    });

    // IDs to exclude — things the user already has some relationship with
    const excludeIds = new Set(signalListings.map(l => l._id.toString()));

    const candidates = await Listing.find({
        _id: { $nin: Array.from(excludeIds) },
    }).populate("reviews");

    const scored = candidates.map((listing) => {

        let score = 0;

        if (listing.category && categoryCount[listing.category]) {
            score += categoryCount[listing.category] * 10;
        }

        if (listing.country && countryCount[listing.country]) {
            score += countryCount[listing.country] * 6;
        }

        if (listing.reviews.length > 0) {

            const avgRating =
                listing.reviews.reduce((sum, r) => sum + r.rating, 0) /
                listing.reviews.length;

            score += avgRating * 2;

        }

        return {
            ...listing.toObject(),
            score,
            random: Math.random(),
        };

    });

    return scored
        .filter(listing => listing.score > 0)
        .sort((a, b) => {

            if (b.score === a.score) {
                return b.random - a.random;
            }

            return b.score - a.score;

        })
        .slice(0, 6);

}
 module.exports.searchSuggestions = async (req, res) => {

    const search = req.query.search || "";

    if (!search.trim()) {
        return res.json([]);
    }

    const listings = await Listing.find({
        $or: [
            { title: { $regex: search, $options: "i" } },
            { location: { $regex: search, $options: "i" } },
            { country: { $regex: search, $options: "i" } }
        ]
    })
    .select("title location country")
    .limit(8);

    res.json(listings);

};
// ==========================================
// MY LISTINGS ROUTE
// Shows only the listings owned by the logged-in host
// ==========================================

module.exports.myListings = async (req, res) => {

    const myListings = await Listing.find({
        owner: req.user._id,
    }).populate("reviews");

    let wishlist = [];

    if (req.user) {

        const user = await User.findById(req.user._id);

        wishlist = user.wishlist.map(id => id.toString());

    }

    res.render("listings/myListings.ejs", {

        allListings: myListings,

        wishlist,

    });

};

// ==========================================
// COMPARE LISTINGS
// GET /listings/compare?ids=id1,id2,id3
// ==========================================

module.exports.compareListings = async (req, res) => {

    const idsParam = req.query.ids || "";

    const ids = idsParam
        .split(",")
        .map(id => id.trim())
        .filter(Boolean)
        .slice(0, 4); // cap at 4 listings for a readable table

    if (ids.length === 0) {
        req.flash("error", "Select at least one listing to compare.");
        return res.redirect("/listings");
    }

    const listings = await Listing.find({
        _id: { $in: ids },
    }).populate("reviews");

    // Preserve the order the user selected them in
    const ordered = ids
        .map(id => listings.find(l => l._id.toString() === id))
        .filter(Boolean);

    res.render("listings/compare.ejs", {
        listings: ordered,
    });

};

// SHOW ROUTE
// =====================================

module.exports.showListing = async (req, res) => {

    const { id } = req.params;

    // ==========================
// Recently Viewed Listings
// ==========================

if (!req.session.recentListings) {
    req.session.recentListings = [];
}

req.session.recentListings =
    req.session.recentListings.filter(
        listingId => listingId.toString() !== id
    );

req.session.recentListings.unshift(id);

req.session.recentListings =
    req.session.recentListings.slice(0, 6);

    const listing = await Listing.findById(id)
        .populate("owner")
        .populate({
            path: "reviews",
            populate: {
                path: "author",
            },
        });

    if (!listing) {

        req.flash("error", "Listing not found!");

        return res.redirect("/listings");

    }

    // ==========================
    // View Count
    // (fire-and-forget so it never blocks or breaks the page render)
    // ==========================

    Listing.findByIdAndUpdate(id, { $inc: { views: 1 } }).catch(() => {});

    // ==========================
    // Average Rating
    // ==========================

    let averageRating = 0;

    if (listing.reviews.length > 0) {

        const total = listing.reviews.reduce((sum, review) => {

            return sum + review.rating;

        }, 0);

        averageRating = total / listing.reviews.length;

    }

    // ==========================
    // Review Count
    // ==========================

    const reviewCount = listing.reviews.length;
// ==========================
// Host Listing Count
// ==========================

let hostListingCount = 0;

if (listing.owner) {
    hostListingCount = await Listing.countDocuments({
        owner: listing.owner._id,
    });
}

// ==========================
// Similar Listings
// ==========================

const allListings = await Listing.find({
    _id: { $ne: listing._id }
}).populate("reviews");

const similarListings = allListings
    .map(item => {

        let score = 0;

        // Same category
        if (
            listing.category &&
            item.category &&
            listing.category === item.category
        ) {
            score += 50;
        }

        // Same country
        if (
            listing.country &&
            item.country &&
            listing.country === item.country
        ) {
            score += 25;
        }

        // Same location
        if (
            listing.location &&
            item.location &&
            listing.location === item.location
        ) {
            score += 20;
        }

        // Similar price
        if (Math.abs(item.price - listing.price) <= 1000) {
            score += 15;
        }

        // Rating bonus
        if (item.reviews.length > 0) {

            const avgRating =
                item.reviews.reduce((sum, review) => sum + review.rating, 0) /
                item.reviews.length;

            score += avgRating * 2;
        }

        return {
            ...item.toObject(),
            score,
            random: Math.random(),
        };

    })
    .sort((a, b) => {

        if (b.score === a.score) {
            return b.random - a.random;
        }

        return b.score - a.score;

    })
    .slice(0, 4);

// ==========================
// Booked Dates
// ==========================

const bookings = await Booking.find({
    listing: listing._id,
    status: "confirmed",
});

// ==========================
// Bookings This Month
// ==========================

const firstDay = new Date();
firstDay.setDate(1);
firstDay.setHours(0, 0, 0, 0);

const bookingsThisMonth = await Booking.countDocuments({
    listing: listing._id,
    createdAt: {
        $gte: firstDay,
    },
});

// ==========================
// Recently Viewed Data
// ==========================

const recentListings = await Listing.find({
    _id: {
        $in: req.session.recentListings.filter(
            listingId => listingId.toString() !== id
        ),
    },
}).limit(6);
// ==========================
// Has Current User Booked This Listing?
// (used to gate the review form to verified stays)
// ==========================


let hasBookedListing = false;
let isWishlisted = false;

if (req.user) {

    const userBooking = await Booking.findOne({
        listing: listing._id,
        user: req.user._id,
        status: "confirmed",
    });

    hasBookedListing = !!userBooking;

    const currentUser = await User.findById(req.user._id);
    isWishlisted = currentUser.wishlist
        .map(id => id.toString())
        .includes(listing._id.toString());

}

// ==========================
// Selected Amenities (resolve stored IDs -> icon + label for display)
// ==========================

const selectedAmenities = resolveAmenities(listing.amenities);

// ==========================
// Render Page
// ==========================

res.render("listings/show.ejs", {
    listing,
    averageRating,
    reviewCount,
    hostListingCount,
    similarListings,
    recentListings,
    bookings,
    bookingsThisMonth,
        razorpayKey: process.env.RAZORPAY_KEY_ID,
        hasBookedListing,
           isWishlisted,
           selectedAmenities,

});
};
// NEW FORM
module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs", { amenitiesCatalog: AMENITIES_CATALOG });
};

// ==========================================
// AI DESCRIPTION GENERATOR
// ==========================================

module.exports.generateDescriptionAPI = async (req, res) => {

    const { title, category, location, country, price, amenities } = req.body;

    if (!title || !location || !country || !price) {
        return res.status(400).json({ error: "Title, location, country, and price are required." });
    }

    try {

        const description = await generateListingDescription({
            title,
            category,
            location,
            country,
            price,
            amenities,
        });

        res.json({ description });

    } catch (err) {

        console.log("AI description generation error:", err.message);
        res.status(500).json({ error: "Couldn't generate a description right now. Please try again." });

    }

};


// CREATE ROUTE
module.exports.createListing = async (req, res) => {

    const newListing = new Listing(req.body.listing);

    newListing.owner = req.user._id;
    newListing.amenities = sanitizeAmenities(req.body.listing.amenities);

    const uploadedImages = await processUploadedImages(req.files);

    newListing.images = uploadedImages;
    newListing.image = uploadedImages[0]; // backward-compat cover image

    // AI Fraud Detection — flag if any uploaded photo already exists on
    // another owner's listing.
    newListing.fraudWarning = await detectFraud(uploadedImages, {
        excludeListingId: null,
        ownerId: req.user._id,
    });

    const pickedLng = req.body.listing.geometry?.coordinates?.[0];
    const pickedLat = req.body.listing.geometry?.coordinates?.[1];

    if (pickedLng && pickedLat) {
        // User clicked the map — use exact coordinates
        newListing.geometry = {
            type: "Point",
            coordinates: [Number(pickedLng), Number(pickedLat)],
        };
    } else {
        // User only typed location/country — geocode it
        const coords = await getCoordinates(
            req.body.listing.location,
            req.body.listing.country
        );

        if (coords) {
            newListing.geometry = {
                type: "Point",
                coordinates: [coords.longitude, coords.latitude],
            };
        } else {
            req.flash("error", "Couldn't find that location — listing saved with a default location. Please edit it with a more specific address or pick it on the map.");
        }
    }

    await newListing.save();

    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
};


// EDIT ROUTE
module.exports.renderEditForm = async (req, res) => {

    let { id } = req.params;
    const listing = await Listing.findById(id);
    res.render("listings/edit.ejs", { listing, amenitiesCatalog: AMENITIES_CATALOG });

};


// UPDATE ROUTE
module.exports.updateListing = async (req, res) => {

    let { id } = req.params;

    let listing = await Listing.findById(id);

    const locationChanged =
        req.body.listing.location !== listing.location ||
        req.body.listing.country !== listing.country;

    const pickedLng = req.body.listing.geometry?.coordinates?.[0];
    const pickedLat = req.body.listing.geometry?.coordinates?.[1];

    Object.assign(listing, req.body.listing);

    // Object.assign only touches keys that were actually submitted. If the
    // host removes every amenity, no listing[amenities][] inputs exist at
    // all, so this needs to be set explicitly or the old list would silently
    // stick around.
    listing.amenities = sanitizeAmenities(req.body.listing.amenities);

    if (pickedLng && pickedLat) {
        // User clicked the map — use exact coordinates, always wins
        listing.geometry = {
            type: "Point",
            coordinates: [Number(pickedLng), Number(pickedLat)],
        };
    } else if (locationChanged) {
        // Only re-geocode from text if user didn't click the map
        const coords = await getCoordinates(
            req.body.listing.location,
            req.body.listing.country
        );

        if (coords) {
            listing.geometry = {
                type: "Point",
                coordinates: [coords.longitude, coords.latitude],
            };
        }
    }

   if (req.files && req.files.length > 0) {

    // Delete all old images from Cloudinary
    if (listing.images && listing.images.length > 0) {

        for (const img of listing.images) {
            if (img.filename) {
                await cloudinary.uploader.destroy(img.filename);
            }
        }

    } else if (listing.image && listing.image.filename) {
        // Fallback for listings created before the images[] array existed
        await cloudinary.uploader.destroy(listing.image.filename);
    }

    const uploadedImages = await processUploadedImages(req.files);

    listing.images = uploadedImages;
    listing.image = uploadedImages[0]; // backward-compat cover image

    // AI Fraud Detection — re-check against other owners' listings whenever
    // photos are replaced.
    listing.fraudWarning = await detectFraud(uploadedImages, {
        excludeListingId: listing._id,
        ownerId: listing.owner,
    });
}

    await listing.save();

    req.flash("success", "Listing Updated Successfully!");
    res.redirect(`/listings/${id}`);
};


// DELETE ROUTE
module.exports.destroyListing = async (req, res) => {

    let { id } = req.params;
    await Listing.findByIdAndDelete(id);
    res.redirect("/listings");

};