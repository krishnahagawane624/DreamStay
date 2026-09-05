const checkinInput = document.getElementById("checkin-date");
const checkoutInput = document.getElementById("checkout-date");

const hiddenCheckIn = document.getElementById("hidden-checkin");
const hiddenCheckOut = document.getElementById("hidden-checkout");
const guestSelect = document.getElementById("guest-count");
const priceBreakdown = document.getElementById("price-breakdown");
const nightsLabel = document.getElementById("nights-label");
const nightsTotal = document.getElementById("nights-total");
const grandTotal = document.getElementById("grand-total");
const dateError = document.getElementById("date-error");
const bookingForm = document.getElementById("booking-form");


    const pageData = JSON.parse(document.getElementById("page-data").textContent);
    const bookings = pageData.bookings;
    const pricePerNight = pageData.pricePerNight;

    const disabledRanges = bookings
        .filter(b => b.checkIn && b.checkOut)
        .map(b => ({
            from: new Date(b.checkIn),
            to: new Date(b.checkOut)
        }));

    // Colors each calendar day green (available) or red (booked)
 document.addEventListener("DOMContentLoaded", () => {

    if (!checkinInput || !checkoutInput) return;

    // Colors a flatpickr day cell green (available) or red (booked)
    function markDayAvailability(dObj, dStr, fp, dayElem) {

        const isBooked = disabledRanges.some(range =>
            dayElem.dateObj >= range.from && dayElem.dateObj <= range.to
        );

        dayElem.classList.add(isBooked ? "day-booked" : "day-available");

    }

    const checkoutPicker = flatpickr(checkoutInput, {

        minDate: "today",

        dateFormat: "Y-m-d",

        disableMobile: true,

        animate: true,

        disable: disabledRanges,

        onDayCreate: markDayAvailability

    });

    flatpickr(checkinInput, {

        minDate: "today",

        dateFormat: "Y-m-d",

        disableMobile: true,

        animate: true,

        disable: disabledRanges,

        onDayCreate: markDayAvailability,

        onChange(selectedDates){

            if(selectedDates.length===0) return;

            hiddenCheckIn.value = selectedDates[0].toISOString();

            checkoutPicker.set("minDate",selectedDates[0]);

        }

    });

    checkoutPicker.config.onChange.push(function(selectedDates){

        if(selectedDates.length===0) return;

        hiddenCheckOut.value = selectedDates[0].toISOString();

        calculateTotal();

    });

});
    function calculateTotal() {

        const checkIn = document.getElementById("hidden-checkin").value;
        const checkOut = document.getElementById("hidden-checkout").value;

        if (!checkIn || !checkOut) return;

        const start = new Date(checkIn);
        const end = new Date(checkOut);

        const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

        if (nights <= 0) return;

        const subtotal = nights * pricePerNight;
        const service = Math.round(subtotal * 0.10);

        // Indian hotel-tariff GST slab: 12% if nightly rate <= ₹7500, else 18%
        const gstRate = pricePerNight <= 7500 ? 0.12 : 0.18;
        const gst = Math.round((subtotal + service) * gstRate);

        const total = subtotal + service + gst;

        document.getElementById("night-count").innerText = nights;
        document.getElementById("subtotal").innerText = "₹" + subtotal.toLocaleString("en-IN");
        document.getElementById("service-fee").innerText = "₹" + service.toLocaleString("en-IN");
        document.getElementById("gst-amount").innerText = "₹" + gst.toLocaleString("en-IN");
        document.getElementById("gst-rate-label").innerText = (gstRate * 100) + "%";
        document.getElementById("total-price").innerText = "₹" + total.toLocaleString("en-IN");

        document.getElementById("hidden-service-fee").value = service;
        document.getElementById("hidden-gst-rate").value = gstRate;
        document.getElementById("hidden-gst-amount").value = gst;
        document.getElementById("hidden-grand-total").value = total;

    }

    const guest = document.getElementById("guest-count");

    if (guest) {
        guest.addEventListener("change", calculateTotal);
    }

    if (bookingForm) {

    bookingForm.addEventListener("submit", (e) => {

        const checkIn = document.getElementById("hidden-checkin").value;
        const checkOut = document.getElementById("hidden-checkout").value;

        if (!checkIn || !checkOut) {
            e.preventDefault();
            alert("Please select check-in and check-out dates.");
            return;
        }

        const nights = Math.ceil(
            (new Date(checkOut) - new Date(checkIn)) /
            (1000 * 60 * 60 * 24)
        );

        if (nights <= 0) {
            e.preventDefault();
            alert("Check-out must be after check-in.");
            return;
        }

    });

}

    // Star rating widget
    const starContainer = document.getElementById("star-rating");

    if (starContainer) {

        const stars = Array.from(starContainer.querySelectorAll("i"));
        const ratingInput = document.getElementById("rating-value");

        function paintStars(value) {
            stars.forEach(star => {
                const starValue = Number(star.dataset.value);
                star.classList.toggle("active", starValue <= value);
            });
        }

        // Default to 5 stars filled on load, matching the hidden input's default value
        paintStars(Number(ratingInput.value));

        stars.forEach(star => {

            star.addEventListener("mouseenter", () => {
                paintStars(Number(star.dataset.value));
            });

            star.addEventListener("click", () => {
                ratingInput.value = star.dataset.value;
                paintStars(Number(star.dataset.value));
            });

        });

        starContainer.addEventListener("mouseleave", () => {
            paintStars(Number(ratingInput.value));
        });

    }