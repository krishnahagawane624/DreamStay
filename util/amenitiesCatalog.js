// ==========================================
// AMENITIES CATALOG
// A single source of truth for every amenity a host can attach to a
// listing. Each entry has:
//   id       — stable identifier stored on the listing (never change once
//              listings exist, or old listings will lose that amenity)
//   label    — text shown to the user
//   icon     — Font Awesome class (Font Awesome is already loaded site-wide)
//   category — used to group results in the search UI
//
// This same array is embedded into the create/edit forms (as JSON) to power
// the searchable picker, and used server-side to look up icon/label when
// rendering a listing's selected amenities.
// ==========================================

const AMENITIES_CATALOG = [

    // ----- Essentials -----
    { id: "wifi", label: "Wifi", icon: "fa-solid fa-wifi", category: "Essentials" },
    { id: "ac", label: "Air conditioning", icon: "fa-solid fa-snowflake", category: "Essentials" },
    { id: "heating", label: "Heating", icon: "fa-solid fa-fire", category: "Essentials" },
    { id: "kitchen", label: "Kitchen", icon: "fa-solid fa-kitchen-set", category: "Essentials" },
    { id: "washer", label: "Washer", icon: "fa-solid fa-shirt", category: "Essentials" },
    { id: "dryer", label: "Dryer", icon: "fa-solid fa-wind", category: "Essentials" },
    { id: "dedicated_workspace", label: "Dedicated workspace", icon: "fa-solid fa-laptop", category: "Essentials" },
    { id: "hair_dryer", label: "Hair dryer", icon: "fa-solid fa-wind", category: "Essentials" },
    { id: "iron", label: "Iron", icon: "fa-solid fa-shirt", category: "Essentials" },
    { id: "essentials_towels", label: "Towels & linens", icon: "fa-solid fa-bed", category: "Essentials" },
    { id: "hangers", label: "Hangers", icon: "fa-solid fa-shirt", category: "Essentials" },
    { id: "extra_pillows", label: "Extra pillows & blankets", icon: "fa-solid fa-bed", category: "Essentials" },

    // ----- Kitchen & Dining -----
    { id: "refrigerator", label: "Refrigerator", icon: "fa-solid fa-snowflake", category: "Kitchen & Dining" },
    { id: "microwave", label: "Microwave", icon: "fa-solid fa-kitchen-set", category: "Kitchen & Dining" },
    { id: "stove", label: "Stove", icon: "fa-solid fa-fire", category: "Kitchen & Dining" },
    { id: "oven", label: "Oven", icon: "fa-solid fa-fire", category: "Kitchen & Dining" },
    { id: "dishwasher", label: "Dishwasher", icon: "fa-solid fa-sink", category: "Kitchen & Dining" },
    { id: "coffee_maker", label: "Coffee maker", icon: "fa-solid fa-mug-hot", category: "Kitchen & Dining" },
    { id: "kettle", label: "Electric kettle", icon: "fa-solid fa-mug-hot", category: "Kitchen & Dining" },
    { id: "blender", label: "Blender", icon: "fa-solid fa-blender", category: "Kitchen & Dining" },
    { id: "dining_table", label: "Dining table", icon: "fa-solid fa-utensils", category: "Kitchen & Dining" },
    { id: "cooking_basics", label: "Cooking basics", icon: "fa-solid fa-utensils", category: "Kitchen & Dining" },
    { id: "dishes_silverware", label: "Dishes & silverware", icon: "fa-solid fa-utensils", category: "Kitchen & Dining" },
    { id: "wine_glasses", label: "Wine glasses", icon: "fa-solid fa-wine-glass", category: "Kitchen & Dining" },
    { id: "bbq_grill", label: "BBQ grill", icon: "fa-solid fa-fire", category: "Kitchen & Dining" },

    // ----- Bathroom -----
    { id: "bathtub", label: "Bathtub", icon: "fa-solid fa-bath", category: "Bathroom" },
    { id: "shower", label: "Shower", icon: "fa-solid fa-shower", category: "Bathroom" },
    { id: "hot_water", label: "Hot water", icon: "fa-solid fa-temperature-half", category: "Bathroom" },
    { id: "shampoo", label: "Shampoo", icon: "fa-solid fa-soap", category: "Bathroom" },
    { id: "body_soap", label: "Body soap", icon: "fa-solid fa-soap", category: "Bathroom" },
    { id: "toilet_paper", label: "Toilet paper", icon: "fa-solid fa-toilet-paper", category: "Bathroom" },
    { id: "bidet", label: "Bidet", icon: "fa-solid fa-toilet", category: "Bathroom" },

    // ----- Bedroom & Laundry -----
    { id: "bed_linens", label: "Bed linens", icon: "fa-solid fa-bed", category: "Bedroom & Laundry" },
    { id: "wardrobe", label: "Wardrobe / closet", icon: "fa-solid fa-shirt", category: "Bedroom & Laundry" },
    { id: "blackout_curtains", label: "Blackout curtains", icon: "fa-solid fa-moon", category: "Bedroom & Laundry" },
    { id: "safe", label: "Room safe", icon: "fa-solid fa-lock", category: "Bedroom & Laundry" },
    { id: "laundromat_nearby", label: "Laundromat nearby", icon: "fa-solid fa-shirt", category: "Bedroom & Laundry" },

    // ----- Entertainment & Tech -----
    { id: "tv", label: "TV", icon: "fa-solid fa-tv", category: "Entertainment & Tech" },
    { id: "streaming_services", label: "Streaming services", icon: "fa-solid fa-tv", category: "Entertainment & Tech" },
    { id: "sound_system", label: "Sound system", icon: "fa-solid fa-headphones", category: "Entertainment & Tech" },
    { id: "books", label: "Books & reading material", icon: "fa-solid fa-book", category: "Entertainment & Tech" },
    { id: "board_games", label: "Board games", icon: "fa-solid fa-dice", category: "Entertainment & Tech" },
    { id: "gaming_console", label: "Gaming console", icon: "fa-solid fa-gamepad", category: "Entertainment & Tech" },
    { id: "piano", label: "Piano", icon: "fa-solid fa-music", category: "Entertainment & Tech" },
    { id: "guitar", label: "Guitar", icon: "fa-solid fa-guitar", category: "Entertainment & Tech" },
    { id: "smart_lock", label: "Smart lock", icon: "fa-solid fa-lock", category: "Entertainment & Tech" },
    { id: "printer", label: "Printer", icon: "fa-solid fa-print", category: "Entertainment & Tech" },

    // ----- Outdoor & View -----
    { id: "swimming_pool", label: "Swimming pool", icon: "fa-solid fa-water-ladder", category: "Outdoor & View" },
    { id: "hot_tub", label: "Hot tub", icon: "fa-solid fa-hot-tub-person", category: "Outdoor & View" },
    { id: "balcony", label: "Balcony", icon: "fa-solid fa-door-open", category: "Outdoor & View" },
    { id: "garden", label: "Garden", icon: "fa-solid fa-leaf", category: "Outdoor & View" },
    { id: "patio", label: "Patio / courtyard", icon: "fa-solid fa-umbrella-beach", category: "Outdoor & View" },
    { id: "sea_view", label: "Sea view", icon: "fa-solid fa-water", category: "Outdoor & View" },
    { id: "mountain_view", label: "Mountain view", icon: "fa-solid fa-mountain", category: "Outdoor & View" },
    { id: "beach_access", label: "Beach access", icon: "fa-solid fa-umbrella-beach", category: "Outdoor & View" },
    { id: "lake_access", label: "Lake access", icon: "fa-solid fa-water", category: "Outdoor & View" },
    { id: "fire_pit", label: "Fire pit", icon: "fa-solid fa-fire", category: "Outdoor & View" },
    { id: "outdoor_furniture", label: "Outdoor furniture", icon: "fa-solid fa-chair", category: "Outdoor & View" },
    { id: "hammock", label: "Hammock", icon: "fa-solid fa-bed", category: "Outdoor & View" },
    { id: "camping_area", label: "Camping area", icon: "fa-solid fa-campground", category: "Outdoor & View" },

    // ----- Fitness & Recreation -----
    { id: "gym", label: "Gym / fitness centre", icon: "fa-solid fa-dumbbell", category: "Fitness & Recreation" },
    { id: "yoga_space", label: "Yoga space", icon: "fa-solid fa-spa", category: "Fitness & Recreation" },
    { id: "bicycle", label: "Bicycles available", icon: "fa-solid fa-bicycle", category: "Fitness & Recreation" },
    { id: "hiking_trails", label: "Hiking trails nearby", icon: "fa-solid fa-person-hiking", category: "Fitness & Recreation" },
    { id: "skiing_nearby", label: "Skiing nearby", icon: "fa-solid fa-person-skiing", category: "Fitness & Recreation" },
    { id: "golf_course", label: "Golf course access", icon: "fa-solid fa-golf-ball-tee", category: "Fitness & Recreation" },
    { id: "fishing", label: "Fishing spot", icon: "fa-solid fa-fish", category: "Fitness & Recreation" },
    { id: "boat_dock", label: "Boat dock", icon: "fa-solid fa-anchor", category: "Fitness & Recreation" },
    { id: "table_tennis", label: "Table tennis", icon: "fa-solid fa-table-tennis-paddle-ball", category: "Fitness & Recreation" },

    // ----- Safety -----
    { id: "smoke_alarm", label: "Smoke alarm", icon: "fa-solid fa-bell", category: "Safety" },
    { id: "carbon_monoxide_alarm", label: "Carbon monoxide alarm", icon: "fa-solid fa-bell", category: "Safety" },
    { id: "fire_extinguisher", label: "Fire extinguisher", icon: "fa-solid fa-fire-extinguisher", category: "Safety" },
    { id: "first_aid_kit", label: "First aid kit", icon: "fa-solid fa-kit-medical", category: "Safety" },
    { id: "security_cameras", label: "Security cameras (exterior)", icon: "fa-solid fa-camera", category: "Safety" },
    { id: "safe_stay", label: "Safe & secure area", icon: "fa-solid fa-shield-heart", category: "Safety" },
    { id: "gated_property", label: "Gated property", icon: "fa-solid fa-lock", category: "Safety" },
    { id: "life_jackets", label: "Life jackets", icon: "fa-solid fa-life-ring", category: "Safety" },

    // ----- Parking & Facilities -----
    { id: "free_parking", label: "Free parking", icon: "fa-solid fa-square-parking", category: "Parking & Facilities" },
    { id: "paid_parking", label: "Paid parking", icon: "fa-solid fa-square-parking", category: "Parking & Facilities" },
    { id: "ev_charger", label: "EV charger", icon: "fa-solid fa-charging-station", category: "Parking & Facilities" },
    { id: "elevator", label: "Elevator", icon: "fa-solid fa-building", category: "Parking & Facilities" },
    { id: "single_level", label: "Single-level property", icon: "fa-solid fa-house-chimney", category: "Parking & Facilities" },
    { id: "luggage_dropoff", label: "Luggage drop-off allowed", icon: "fa-solid fa-suitcase-rolling", category: "Parking & Facilities" },
    { id: "self_checkin", label: "Self check-in", icon: "fa-solid fa-key", category: "Parking & Facilities" },
    { id: "reception_24h", label: "24-hour reception", icon: "fa-solid fa-bell", category: "Parking & Facilities" },
    { id: "concierge", label: "Concierge service", icon: "fa-solid fa-suitcase", category: "Parking & Facilities" },
    { id: "storage", label: "Luggage storage", icon: "fa-solid fa-box", category: "Parking & Facilities" },

    // ----- Family -----
    { id: "crib", label: "Crib", icon: "fa-solid fa-baby", category: "Family" },
    { id: "high_chair", label: "High chair", icon: "fa-solid fa-child", category: "Family" },
    { id: "childproofing", label: "Childproofing", icon: "fa-solid fa-child", category: "Family" },
    { id: "kids_books_toys", label: "Kids' books & toys", icon: "fa-solid fa-puzzle-piece", category: "Family" },
    { id: "playground", label: "Playground nearby", icon: "fa-solid fa-child", category: "Family" },

    // ----- Accessibility -----
    { id: "step_free_entrance", label: "Step-free entrance", icon: "fa-solid fa-wheelchair", category: "Accessibility" },
    { id: "wide_doorways", label: "Wide doorways", icon: "fa-solid fa-door-open", category: "Accessibility" },
    { id: "accessible_bathroom", label: "Accessible bathroom", icon: "fa-solid fa-wheelchair", category: "Accessibility" },
    { id: "accessible_parking", label: "Accessible parking spot", icon: "fa-solid fa-wheelchair", category: "Accessibility" },

    // ----- Pets & Extras -----
    { id: "pet_friendly", label: "Pet friendly", icon: "fa-solid fa-paw", category: "Pets & Extras" },
    { id: "pet_bowls", label: "Pet bowls", icon: "fa-solid fa-paw", category: "Pets & Extras" },
    { id: "no_smoking", label: "No smoking", icon: "fa-solid fa-ban-smoking", category: "Pets & Extras" },
    { id: "long_term_stays", label: "Long-term stays allowed", icon: "fa-solid fa-calendar", category: "Pets & Extras" },
    { id: "events_allowed", label: "Events allowed", icon: "fa-solid fa-champagne-glasses", category: "Pets & Extras" },
    { id: "breakfast_included", label: "Breakfast included", icon: "fa-solid fa-mug-hot", category: "Pets & Extras" },
    { id: "housekeeping", label: "Housekeeping available", icon: "fa-solid fa-broom", category: "Pets & Extras" },
    { id: "waterfront", label: "Waterfront", icon: "fa-solid fa-water", category: "Pets & Extras" },
];

function getAmenityById(id) {
    return AMENITIES_CATALOG.find(a => a.id === id) || null;
}

// Given an array of amenity IDs stored on a listing, returns the matching
// catalog entries (icon + label) in the same order, silently skipping any
// unknown/legacy IDs.
function resolveAmenities(ids) {
    return (ids || [])
        .map(id => getAmenityById(id))
        .filter(Boolean);
}

module.exports = {
    AMENITIES_CATALOG,
    getAmenityById,
    resolveAmenities,
};