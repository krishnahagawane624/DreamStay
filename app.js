if(process.env.NODE_ENV != "production"){

    require("dotenv").config();

}
const express = require ("express");
const app = express();
const mongoose = require ("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./util/wrapAsync.js");
const ExpressError = require("./util/ExpressError.js");
const listingRouter = require("./routes/listings");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("./models/user");
const userRouter = require("./routes/users");
const reviewRouter = require("./routes/reviews");
const wishlistRoutes = require("./routes/wishlist");
const paymentRoutes = require("./routes/payment");
const profileRouter = require("./routes/profile");
const notificationRouter = require("./routes/notifications");
const chatRouter = require("./routes/chat");
const tripPlannerRouter = require("./routes/tripPlanner");
const aiChatRouter = require("./routes/aiChat");
const Message = require("./models/message");
const Conversation = require("./models/conversation");
const http = require("http");
const { initSocket } = require("./socket");

// In production this MUST be set to a real cloud database (e.g. MongoDB
// Atlas) via env var — the local fallback only works on your own machine.
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/wanderlust";

main()
  .then(() => {
    console.log("connected to DB");
})
.catch((err) => {
    console.log(err);
});

async function main() {
    await mongoose.connect(MONGO_URL);

}
app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));

// Needed in production so secure cookies work correctly behind a hosting
// platform's reverse proxy (Render, Railway, Heroku, etc.)
if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
}

app.use(express.urlencoded({extended:true}));
app.use(express.json());

const store = MongoStore.create({
    mongoUrl: MONGO_URL,
    touchAfter: 24 * 3600,
});

store.on("error", (err) => {
    console.log("SESSION STORE ERROR:", err);
});

// SESSION_SECRET should always be set via env var in production. The
// fallback below only exists so local development keeps working without
// extra setup — it must never be relied on once deployed.
if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    console.log("WARNING: SESSION_SECRET is not set — using an insecure default. Set SESSION_SECRET in your environment before real users touch this deployment.");
}

const sessionOptions = {
    store,
    secret: process.env.SESSION_SECRET || "dreamstaysecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    },
};
const sessionMiddleware = session(sessionOptions);
app.use(sessionMiddleware);
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
        },

        async (accessToken, refreshToken, profile, done) => {
            try {

                let user = await User.findOne({
                    googleId: profile.id,
                });

                if (user) {
                    return done(null, user);
                }

                const email = profile.emails[0].value;

                user = await User.findOne({
                    email: email,
                });

                if (user) {

                    user.googleId = profile.id;

                    await user.save();

                    return done(null, user);
                }

                const newUser = new User({
                    username: profile.displayName,
                    email: email,
                    googleId: profile.id,
                });

                await User.register(
                    newUser,
                    Math.random().toString(36)
                );

                return done(null, newUser);

            } catch (err) {
                return done(err, false);
            }
        }
    )
);

app.use(async (req, res, next) => {

    res.locals.success = req.flash("success");

    res.locals.error = req.flash("error");

    res.locals.currUser = req.user;

    if (req.user) {

        const myConversations = await Conversation.find({
            participants: req.user._id,
        }).select("_id");

        const conversationIds = myConversations.map(c => c._id);

        res.locals.unreadMessagesCount = await Message.countDocuments({
            conversation: { $in: conversationIds },
            sender: { $ne: req.user._id },
            read: false,
        });

    } else {

        res.locals.unreadMessagesCount = 0;

    }

    next();

});
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname,"/public")));
app.use("/", wishlistRoutes);
app.use("/payment", paymentRoutes);
app.use("/", notificationRouter);
app.use("/chat", chatRouter);
app.use("/trip-planner", tripPlannerRouter);
app.use("/ai-chat", aiChatRouter);




app.get("/", (req, res) => {
    res.send("Hi, I am groot");
});

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/profile", profileRouter);
const bookingRouter = require("./routes/bookings");
const myBookingsRouter = require("./routes/myBookings");

app.use("/listings/:id/bookings", bookingRouter);
app.use("/", myBookingsRouter);

app.use("/", userRouter);

app.all("/*splat", (req, res, next) => {
    next(new ExpressError(404, "Page Not Found!"));
});

app.use((err, req, res, next) => {
    let{statusCode =500, message ="Something Went Wrong"} = err;
    res.status(statusCode).send(message);
});


// ==========================================
// HTTP server + Socket.io (needed for real-time chat)
// ==========================================

const server = http.createServer(app);

initSocket(server, sessionMiddleware, passport);

// Hosting platforms (Render, Railway, Heroku, etc.) assign a port
// dynamically via process.env.PORT — 8080 is only used for local dev.
const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
    console.log(`server is listening to port ${PORT}`);
});