// ============================================================
// DreamStay - Razorpay Payment
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    const bookingForm = document.getElementById("booking-form");
    const payButton = document.getElementById("pay-btn");

    if (!bookingForm || !payButton) {
        return;
    }

    // ------------------------------------------------------------
    // SAFE JSON RESPONSE HELPER
    // ------------------------------------------------------------

    async function getResponseData(response) {

        const contentType =
            response.headers.get("content-type") || "";

        // Server returned JSON
        if (contentType.includes("application/json")) {
            return await response.json();
        }

        // Server returned HTML instead of JSON
        const text = await response.text();

        console.error(
            "Expected JSON but received:",
            text.substring(0, 300)
        );

        return {
            success: false,
            message:
                "Your session may have expired. Please login again."
        };
    }


    // ------------------------------------------------------------
    // BUTTON CLICK
    // ------------------------------------------------------------

    payButton.addEventListener("click", async (event) => {

        event.preventDefault();


        // --------------------------------------------------------
        // PREVENT DOUBLE CLICK
        // --------------------------------------------------------

        if (payButton.disabled) {
            return;
        }


        // --------------------------------------------------------
        // GET BOOKING DETAILS
        // --------------------------------------------------------

        const listingId =
            bookingForm.dataset.listingId ||
            bookingForm.querySelector(
                '[name="listingId"]'
            )?.value;

        const checkIn =
            bookingForm.querySelector(
                '[name="checkIn"]'
            )?.value;

        const checkOut =
            bookingForm.querySelector(
                '[name="checkOut"]'
            )?.value;

        const guests =
            bookingForm.querySelector(
                '[name="guests"]'
            )?.value;


        // --------------------------------------------------------
        // VALIDATION
        // --------------------------------------------------------

        if (!listingId) {
            alert("Listing information is missing.");
            return;
        }

        if (!checkIn || !checkOut) {
            alert("Please select check-in and check-out dates.");
            return;
        }

        if (!guests) {
            alert("Please select the number of guests.");
            return;
        }


        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);


        if (
            Number.isNaN(checkInDate.getTime()) ||
            Number.isNaN(checkOutDate.getTime())
        ) {
            alert("Please select valid dates.");
            return;
        }


        if (checkOutDate <= checkInDate) {
            alert("Check-out date must be after check-in date.");
            return;
        }


        // --------------------------------------------------------
        // DISABLE BUTTON
        // --------------------------------------------------------

        const originalButtonText =
            payButton.innerHTML;

        payButton.disabled = true;
        payButton.innerHTML = "Processing...";


        try {

            // ====================================================
            // STEP 1
            // CHECK LOGIN + CREATE RAZORPAY ORDER
            // ====================================================

            const orderResponse =
                await fetch("/payment/create-order", {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json"
                    },

                    credentials: "same-origin",

                    body: JSON.stringify({
                        listingId,
                        checkIn,
                        checkOut,
                        guests
                    })
                });


            const orderData =
                await getResponseData(
                    orderResponse
                );


            // ----------------------------------------------------
            // LOGIN REQUIRED
            // ----------------------------------------------------

            if (
                orderResponse.status === 401
            ) {

                alert(
                    "Please login before making a booking."
                );

                window.location.href =
                    "/login?returnTo=" +
                    encodeURIComponent(
                        window.location.pathname
                    );

                return;
            }


            // ----------------------------------------------------
            // ORDER CREATION FAILED
            // ----------------------------------------------------

            if (
                !orderResponse.ok ||
                !orderData.success
            ) {

                alert(
                    orderData.message ||
                    "Unable to start payment."
                );

                return;
            }


            // ====================================================
            // STEP 2
            // OPEN RAZORPAY CHECKOUT
            // ====================================================

            if (
                typeof Razorpay ===
                "undefined"
            ) {

                alert(
                    "Razorpay could not be loaded. Please refresh the page."
                );

                return;
            }


            const options = {

                key: orderData.key,

                amount: orderData.amount,

                currency:
                    orderData.currency || "INR",

                name: "DreamStay",

                description:
                    "Booking payment",

                order_id:
                    orderData.orderId,


                // ------------------------------------------------
                // PREFILL USER INFORMATION
                // ------------------------------------------------

                prefill: {

                    name:
                        bookingForm.dataset.username ||
                        "",

                    email:
                        bookingForm.dataset.email ||
                        "",

                    contact:
                        bookingForm.dataset.contact ||
                        ""
                },


                theme: {
                    color: "#D85A30"
                },


                // =================================================
                // PAYMENT SUCCESS
                // =================================================

                handler: async function (
                    paymentResponse
                ) {

                    try {

                        // -----------------------------------------
                        // VERIFY PAYMENT ON SERVER
                        // -----------------------------------------

                        const verifyResponse =
                            await fetch(
                                "/payment/verify",
                                {

                                    method: "POST",

                                    headers: {
                                        "Content-Type":
                                            "application/json",

                                        "Accept":
                                            "application/json"
                                    },

                                    credentials:
                                        "same-origin",

                                    body:
                                        JSON.stringify({

                                            razorpay_order_id:
                                                paymentResponse
                                                    .razorpay_order_id,

                                            razorpay_payment_id:
                                                paymentResponse
                                                    .razorpay_payment_id,

                                            razorpay_signature:
                                                paymentResponse
                                                    .razorpay_signature
                                        })
                                }
                            );


                        const verifyData =
                            await getResponseData(
                                verifyResponse
                            );


                        // -----------------------------------------
                        // PAYMENT VERIFICATION FAILED
                        // -----------------------------------------

                        if (
                            !verifyResponse.ok ||
                            !verifyData.success
                        ) {

                            alert(
                                verifyData.message ||
                                "Payment verification failed."
                            );

                            return;
                        }


                        // =================================================
                        // VERY IMPORTANT
                        //
                        // DO NOT SUBMIT BOOKING FORM HERE.
                        //
                        // verifyPayment() ALREADY CREATES THE BOOKING.
                        // =================================================

                        if (
                            verifyData.bookingId
                        ) {

                            window.location.href =
                                "/bookings/" +
                                verifyData.bookingId;

                            return;
                        }


                        alert(
                            "Payment successful, but booking confirmation could not be opened."
                        );

                    } catch (error) {

                        console.error(
                            "Payment verification error:",
                            error
                        );

                        alert(
                            "Payment was completed, but we could not confirm the booking. Please check My Bookings."
                        );
                    }

                },


                // =================================================
                // PAYMENT MODAL CLOSED
                // =================================================

                modal: {

                    ondismiss: function () {

                        payButton.disabled =
                            false;

                        payButton.innerHTML =
                            originalButtonText;
                    }

                }

            };


            // ----------------------------------------------------
            // OPEN RAZORPAY
            // ----------------------------------------------------

            const razorpay =
                new Razorpay(options);


            // ----------------------------------------------------
            // PAYMENT FAILURE
            // ----------------------------------------------------

            razorpay.on(
                "payment.failed",
                function (response) {

                    console.error(
                        "Razorpay payment failed:",
                        response
                    );

                    alert(
                        response.error?.description ||
                        "Payment failed. Please try again."
                    );

                    payButton.disabled =
                        false;

                    payButton.innerHTML =
                        originalButtonText;
                }
            );


            razorpay.open();


        } catch (error) {

            console.error(
                "Payment start error:",
                error
            );

            alert(
                "Unable to start payment. Please try again."
            );

        } finally {

            // Do not immediately re-enable the button
            // if Razorpay is open.
            //
            // Razorpay's modal.ondismiss or payment.failed
            // will restore it.

        }

    });

});