const nodemailer = require("nodemailer");

// Uses Gmail SMTP. Requires EMAIL_USER and EMAIL_PASS
// (a Gmail App Password, NOT your normal Gmail password)
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    family: 4,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

function generateOtp() {
    // 6-digit numeric OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOtpEmail(toEmail, username, otp) {

    const mailOptions = {
        from: `"DreamStay" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: "Verify your DreamStay account",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #eee; border-radius: 12px;">
                <h2 style="color: #D85A30; margin-bottom: 4px;">DreamStay</h2>
                <p style="color: #555;">Hi ${username},</p>
                <p style="color: #555;">Use the code below to verify your email address. This code expires in 10 minutes.</p>
                <div style="background: #f8f4f1; text-align: center; padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #212529;">${otp}</span>
                </div>
                <p style="color: #999; font-size: 0.85rem;">If you didn't request this, you can safely ignore this email.</p>
            </div>
        `,
    };

    await transporter.sendMail(mailOptions);
}

function emailShell(title, bodyHtml) {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #eee; border-radius: 12px;">
            <h2 style="color: #D85A30; margin-bottom: 4px;">DreamStay</h2>
            <h3 style="color: #212529; margin-top: 0;">${title}</h3>
            ${bodyHtml}
            <p style="color: #999; font-size: 0.8rem; margin-top: 24px;">DreamStay · This is an automated email.</p>
        </div>
    `;
}

async function sendBookingConfirmationEmail(toEmail, username, { listingTitle, checkIn, checkOut, guests, grandTotal }) {

    const html = emailShell("Booking Confirmed! 🎉", `
        <p style="color: #555;">Hi ${username},</p>
        <p style="color: #555;">Your booking for <strong>${listingTitle}</strong> is confirmed.</p>
        <div style="background: #f8f4f1; padding: 16px; border-radius: 10px; margin: 16px 0; color: #333;">
            <p style="margin: 4px 0;"><strong>Check-in:</strong> ${new Date(checkIn).toDateString()}</p>
            <p style="margin: 4px 0;"><strong>Check-out:</strong> ${new Date(checkOut).toDateString()}</p>
            <p style="margin: 4px 0;"><strong>Guests:</strong> ${guests}</p>
            <p style="margin: 4px 0;"><strong>Total Paid:</strong> ₹${Number(grandTotal).toLocaleString("en-IN")}</p>
        </div>
        <p style="color: #555;">You can view or manage this booking anytime from your DreamStay account.</p>
    `);

    await transporter.sendMail({
        from: `"DreamStay" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `Booking Confirmed — ${listingTitle}`,
        html,
    });
}

async function sendNewBookingHostEmail(toEmail, hostUsername, { listingTitle, guestUsername, checkIn, checkOut, grandTotal }) {

    const html = emailShell("New Booking Received 📅", `
        <p style="color: #555;">Hi ${hostUsername},</p>
        <p style="color: #555;"><strong>${guestUsername}</strong> just booked <strong>${listingTitle}</strong>.</p>
        <div style="background: #f8f4f1; padding: 16px; border-radius: 10px; margin: 16px 0; color: #333;">
            <p style="margin: 4px 0;"><strong>Check-in:</strong> ${new Date(checkIn).toDateString()}</p>
            <p style="margin: 4px 0;"><strong>Check-out:</strong> ${new Date(checkOut).toDateString()}</p>
            <p style="margin: 4px 0;"><strong>Total:</strong> ₹${Number(grandTotal).toLocaleString("en-IN")}</p>
        </div>
    `);

    await transporter.sendMail({
        from: `"DreamStay" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `New Booking — ${listingTitle}`,
        html,
    });
}

async function sendCancellationEmail(toEmail, username, { listingTitle, refundAmount, refundStatus, isHost }) {

    const bodyForGuest = `
        <p style="color: #555;">Hi ${username},</p>
        <p style="color: #555;">Your booking for <strong>${listingTitle}</strong> has been cancelled.</p>
        ${refundAmount > 0 ? `
            <div style="background: #f8f4f1; padding: 16px; border-radius: 10px; margin: 16px 0; color: #333;">
                <p style="margin: 4px 0;"><strong>Refund Amount:</strong> ₹${Number(refundAmount).toLocaleString("en-IN")}</p>
                <p style="margin: 4px 0;"><strong>Refund Status:</strong> ${refundStatus}</p>
            </div>
        ` : `<p style="color: #555;">No refund applies under our cancellation policy.</p>`}
    `;

    const bodyForHost = `
        <p style="color: #555;">Hi ${username},</p>
        <p style="color: #555;">A guest cancelled their booking for <strong>${listingTitle}</strong>.</p>
    `;

    const html = emailShell("Booking Cancelled", isHost ? bodyForHost : bodyForGuest);

    await transporter.sendMail({
        from: `"DreamStay" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `Booking Cancelled — ${listingTitle}`,
        html,
    });
}

module.exports = {
    generateOtp,
    sendOtpEmail,
    sendBookingConfirmationEmail,
    sendNewBookingHostEmail,
    sendCancellationEmail,
};
