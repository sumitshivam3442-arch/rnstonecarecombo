/**
 * RN Herbal - Order Server
 * Sends emails via Gmail SMTP
 */

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const body_parser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(body_parser.json());
app.use(body_parser.urlencoded({ extended: true }));

// Serve static files from current directory FIRST - this is critical
app.use(express.static('.', {
  setHeaders: (res, path) => {
    if (path.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
    if (path.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
    if (path.endsWith('.jpg') || path.endsWith('.jpeg')) res.setHeader('Content-Type', 'image/jpeg');
    if (path.endsWith('.png')) res.setHeader('Content-Type', 'image/png');
    if (path.endsWith('.webp')) res.setHeader('Content-Type', 'image/webp');
    if (path.endsWith('.mp4')) res.setHeader('Content-Type', 'video/mp4');
  }
}));

// Email configuration using Gmail SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_EMAIL || 'digital.work.3442@gmail.com',
    pass: process.env.GMAIL_PASSWORD || 'your-gmail-app-password'
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Test email connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Email server connection error:');
    console.log('Make sure GMAIL_EMAIL and GMAIL_PASSWORD are set in .env file');
    console.log('Error:', error);
  } else {
    console.log('✅ Email server is ready to send emails');
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: '✅ Server is running', timestamp: new Date() });
});

// Order submission endpoint
app.post('/api/submit-order', async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      address,
      city,
      state,
      pincode,
      quantity,
      paymentMethod,
      notes,
      orderDate,
      orderTime,
      totalPrice
    } = req.body;

    // Validation
    if (!fullName || !email || !phone || !address) {
      return res.status(400).json({
        success: false,
        message: 'Required fields are missing'
      });
    }

    console.log(`📦 Processing order from: ${fullName} (${email})`);

    // ===== EMAIL 1: Admin Notification =====
    const adminMailOptions = {
      from: process.env.GMAIL_EMAIL || 'digital.work.3442@gmail.com',
      to: 'digital.work.3442@gmail.com',
      subject: `🎯 New Order from ${fullName}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px; }
    .header { background: linear-gradient(135deg, #1a4d2e, #2d7a52); color: white; padding: 20px; border-radius: 8px; text-align: center; }
    .section { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #d4af37; }
    .section h3 { color: #1a4d2e; margin-top: 0; }
    .field { margin: 10px 0; }
    .label { font-weight: bold; color: #1a4d2e; }
    .value { color: #666; }
    .action { background: #d4af37; color: #1a4d2e; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; font-weight: bold; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 NEW ORDER RECEIVED</h1>
      <p>RN Herbal - Stone-Go Order</p>
    </div>

    <div class="section">
      <h3>👤 Customer Information</h3>
      <div class="field">
        <span class="label">Name:</span>
        <span class="value">${escapeHtml(fullName)}</span>
      </div>
      <div class="field">
        <span class="label">Email:</span>
        <span class="value">${escapeHtml(email)}</span>
      </div>
      <div class="field">
        <span class="label">Phone:</span>
        <span class="value">${escapeHtml(phone)}</span>
      </div>
    </div>

    <div class="section">
      <h3>📍 Delivery Address</h3>
      <div class="field">
        <span class="value">${escapeHtml(address)}<br>${escapeHtml(city)}, ${escapeHtml(state)} ${escapeHtml(pincode)}</span>
      </div>
    </div>

    <div class="section">
      <h3>📦 Order Details</h3>
      <div class="field">
        <span class="label">Product:</span>
        <span class="value">RN Stone Care Combo</span>
      </div>
      <div class="field">
        <span class="label">Quantity:</span>
        <span class="value">${quantity} pack(s)</span>
      </div>
      <div class="field">
        <span class="label">Total Price:</span>
        <span class="value">${totalPrice}</span>
      </div>
      <div class="field">
        <span class="label">Payment Method:</span>
        <span class="value">${paymentMethod}</span>
      </div>
      <div class="field">
        <span class="label">Special Instructions:</span>
        <span class="value">${notes ? escapeHtml(notes) : 'None'}</span>
      </div>
    </div>

    <div class="section">
      <h3>📅 Order Details</h3>
      <div class="field">
        <span class="label">Date & Time:</span>
        <span class="value">${orderDate} at ${orderTime}</span>
      </div>
    </div>

    <div class="action">
      ⚡ ACTION REQUIRED:
      <br>1. Confirm order to customer via WhatsApp/Email
      <br>2. Arrange payment collection if COD
      <br>3. Arrange delivery within 24 hours
    </div>

    <div class="footer">
      <p>This is an automated email. Do not reply to this address.</p>
      <p>RN Herbal — Digital Solution</p>
    </div>
  </div>
</body>
</html>
      `
    };

    // ===== EMAIL 2: Customer Confirmation =====
    const customerMailOptions = {
      from: process.env.GMAIL_EMAIL || 'digital.work.3442@gmail.com',
      to: email,
      subject: `🎉 Order Confirmation - RN Stone Care Combo`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px; }
    .header { background: linear-gradient(135deg, #1a4d2e, #2d7a52); color: white; padding: 20px; border-radius: 8px; text-align: center; }
    .section { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #d4af37; }
    .section h3 { color: #1a4d2e; margin-top: 0; }
    .field { margin: 10px 0; }
    .label { font-weight: bold; color: #1a4d2e; }
    .value { color: #666; }
    .highlight { background: rgba(212, 175, 55, 0.1); padding: 15px; border-radius: 8px; margin: 15px 0; }
    .checklist { list-style: none; padding: 0; }
    .checklist li { padding: 8px 0; }
    .checklist li:before { content: "✓ "; color: #4caf50; font-weight: bold; margin-right: 8px; }
    .cta-button { display: inline-block; background: #1a4d2e; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; margin: 10px 5px; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Order Confirmed!</h1>
      <p>Thank you for ordering from RN Herbal</p>
    </div>

    <div class="section">
      <h3>Hi ${escapeHtml(fullName)},</h3>
      <p>Your order has been received and is being processed right now! 🎯</p>
      <p>Thank you for choosing RN Herbal's Stone Care Combo - the natural solution for kidney & gallbladder stones.</p>
    </div>

    <div class="section">
      <h3>📦 Your Order Details</h3>
      <div class="field">
        <span class="label">Product:</span>
        <span class="value">RN Stone Care Combo (30 days treatment)</span>
      </div>
      <div class="field">
        <span class="label">Quantity:</span>
        <span class="value">${quantity} pack(s)</span>
      </div>
      <div class="field">
        <span class="label">Total Amount:</span>
        <span class="value"><strong>${totalPrice}</strong></span>
      </div>
      <div class="field">
        <span class="label">Payment Method:</span>
        <span class="value">${paymentMethod}</span>
      </div>
      <div class="field">
        <span class="label">Order Date:</span>
        <span class="value">${orderDate} at ${orderTime}</span>
      </div>
    </div>

    <div class="highlight">
      <h3 style="margin-top: 0; color: #1a4d2e;">📍 Delivery Address</h3>
      <span class="value">${escapeHtml(fullName)}<br>${escapeHtml(address)}<br>${escapeHtml(city)}, ${escapeHtml(state)} ${escapeHtml(pincode)}</span>
    </div>

    <div class="section">
      <h3>⚡ What Happens Next?</h3>
      <ul class="checklist">
        <li>Our team will contact you via WhatsApp within 2 hours</li>
        <li>We'll confirm your delivery address</li>
        <li>Order will ship within 24 hours</li>
        <li>You'll receive tracking details via SMS</li>
        <li>Delivery: 3-5 business days (Pan-India)</li>
      </ul>
    </div>

    <div class="section">
      <h3>💬 Need Help?</h3>
      <p><strong>Contact us anytime:</strong></p>
      <p>
        📧 Email: digital.work.3442@gmail.com<br>
        📱 WhatsApp: Available 24/7<br>
        ☎️ Call: Support available during business hours
      </p>
    </div>

    <div class="section">
      <h3>🔒 100% Satisfaction Guarantee</h3>
      <p>Not satisfied with your order? We offer a <strong>100% money-back guarantee</strong> within 30 days of delivery - no questions asked!</p>
    </div>

    <div style="text-align: center; margin: 20px 0;">
      <p>Thank you for choosing RN Herbal! 🙏</p>
      <p><em>Natural • Ayurvedic • Trustworthy</em></p>
    </div>

    <div class="footer">
      <p>This is an automated confirmation email. Your order details have been sent to our server.</p>
      <p>RN Herbal — Digital Solution | digital.work.3442@gmail.com</p>
    </div>
  </div>
</body>
</html>
      `
    };

    // Send admin email
    await transporter.sendMail(adminMailOptions);
    console.log(`✅ Admin email sent to: digital.work.3442@gmail.com`);

    // Send customer email
    await transporter.sendMail(customerMailOptions);
    console.log(`✅ Customer email sent to: ${email}`);

    // Success response
    res.json({
      success: true,
      message: 'Order submitted successfully! Confirmation emails have been sent.',
      orderId: `ORD-${Date.now()}`,
      customerEmail: email
    });

  } catch (error) {
    console.error('❌ Error processing order:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing order. Please try again or contact support.',
      error: error.message
    });
  }
});

// Helper function to escape HTML
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Server error occurred',
    error: err.message
  });
});

// Catch-all route for SPA - serve HTML files for unmatched routes
app.get('*', (req, res) => {
  // If the request is for a path, serve index.html
  if (req.path === '/') {
    res.sendFile(path.join(__dirname, 'index.html'));
  } else if (req.path.endsWith('.html')) {
    res.sendFile(path.join(__dirname, req.path));
  } else {
    // For any other route, serve index.html
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
╔═════════════════════════════════════════╗
║   RN Herbal - Order Server               ║
║   Server running on port ${PORT}            ║
║   ✅ Ready to receive orders              ║
╚═════════════════════════════════════════╝
  `);
});
