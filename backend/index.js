const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// --- DATABASE CONNECTION ---
mongoose.connect('mongodb://localhost:27017/transportDB')
    .then(() => console.log("✅ Database Connected: transportDB"))
    .catch(err => console.error("❌ Connection Error:", err));

// --- MONGODB MODELS ---

const User = mongoose.model('User', new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'customer' }
}));

const Driver = mongoose.model('Driver', new mongoose.Schema({
    driverID: { type: String, required: true, unique: true },
    name: String,
    phone: String,
    licenseNumber: String,
    status: { type: String, default: 'Active' }
}));

const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({
    vehicleNumber: { type: String, required: true, unique: true },
    vehicleModel: String,
    type: String,
    capacity: String,
    currentLocation: { type: String, default: 'Main Hub' },
    status: { type: String, default: 'Available' }
}));

const Shipment = mongoose.model('Shipment', new mongoose.Schema({
    shipmentID: { type: String, required: true, unique: true },
    customerName: String,
    deliveryAddress: String,
    contactNumber: String,
    weight: String,
    assignedVehicle: { type: String, default: 'Unassigned' },
    status: { type: String, default: 'Pending' },
    paymentID: { type: String, default: 'N/A' },
    paymentStatus: { type: String, default: 'Pending' }
}, { timestamps: true }));

const Query = mongoose.model('Query', new mongoose.Schema({
    name: String,
    email: String,
    message: String,
    status: { type: String, default: 'New' },
    date: { type: Date, default: Date.now }
}));

const nodemailer = require('nodemailer');

// 1. Create a Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'parthivptl2003@gmail.com', // Your Gmail
        pass: 'ulrh luwd hmqd rwur'    // Your Google App Password
    }
});

// --- 1. SPECIFIC API ROUTES ---

// Create Shipment (Handles the Payment Data from Frontend)
// --- UPDATED SHIPMENT BOOKING & EMAIL NOTIFICATION ---
app.post('/api/shipments', async (req, res) => {
    try {
        // 1. Extract all fields from the request body
        const { 
            shipmentID, 
            customerName, 
            customerEmail, 
            contactNumber, 
            weight, 
            deliveryAddress, 
            paymentID, 
            paymentStatus 
        } = req.body;

        // 2. Validation: Check if recipient email exists
        if (!customerEmail) {
            return res.status(400).json({ success: false, error: "Recipient email is required." });
        }

        // 3. Save to Database (Await this to ensure data integrity)
        const newShipment = new Shipment(req.body);
        await newShipment.save();

        // 4. Send Immediate Success Response to Frontend (Speed Optimization)
        // The user gets redirected/notified while the email sends in the background
        res.status(201).json({ success: true, data: newShipment });

        // 5. Background Email Task
        const mailOptions = {
            from: '"TMS Pro Logistics" <parthivptl2003@gmail.com>',
            to: customerEmail.toLowerCase().trim(),
            subject: `Shipment Confirmed: ${shipmentID} 🚛`,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
                    <div style="background-color: #3b82f6; padding: 30px; text-align: center; color: white;">
                        <h1 style="margin: 0; font-size: 24px;">Booking Successful!</h1>
                        <p style="margin-top: 10px; opacity: 0.9;">Shipment ID: ${shipmentID}</p>
                    </div>
                    
                    <div style="padding: 30px; color: #1e293b; line-height: 1.6;">
                        <h3 style="color: #3b82f6;">Hello ${customerName},</h3>
                        <p>We've successfully initialized your fleet dispatch protocol. Our team is now assigning a vehicle to your cargo.</p>
                        
                        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #cbd5e1;">
                            <h4 style="margin-top: 0; color: #334155;">📦 Shipment Details:</h4>
                            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                                <tr><td style="padding: 8px 0; color: #64748b;"><b>Weight:</b></td><td style="text-align: right;">${weight}</td></tr>
                                <tr><td style="padding: 8px 0; color: #64748b;"><b>Destination:</b></td><td style="text-align: right;">${deliveryAddress}</td></tr>
                                <tr><td style="padding: 8px 0; color: #64748b;"><b>Payment Status:</b></td><td style="text-align: right; color: #16a34a; font-weight: bold;">${paymentStatus}</td></tr>
                                <tr><td style="padding: 8px 0; color: #64748b;"><b>Reference ID:</b></td><td style="text-align: right; font-family: monospace;">${paymentID}</td></tr>
                            </table>
                        </div>

                
                    
                    <div style="background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
                        © 2026 TMS Pro Infrastructure. This is an automated logistics receipt.<br>
                        Security Protocol: Bcrypt AES-256 Enabled.
                    </div>
                </div>
            `
        };

        // Trigger the mail without 'await' so the process doesn't hold up the user
        transporter.sendMail(mailOptions)
            .then(() => console.log(`✅ Email successfully dispatched to: ${customerEmail}`))
            .catch(mailErr => console.error("❌ Background Mailer Error:", mailErr.message));

    } catch (err) {
        console.error("❌ Critical Server Error:", err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
});

// Customer Inquiries
app.post('/api/queries', async (req, res) => {
    try {
        const newQuery = new Query(req.body);
        await newQuery.save();
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/queries', async (req, res) => {
    res.json(await Query.find().sort({ date: -1 }));
});

app.delete('/api/queries/:id', async (req, res) => {
    await Query.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

app.put('/api/queries/:id', async (req, res) => {
    await Query.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true });
});

// Analytics Dashboard - UPDATED
app.get('/api/dashboard-stats', async (req, res) => {
    try {
        const vehicles = await Vehicle.countDocuments();
        const activeTrips = await Vehicle.countDocuments({ status: 'On Trip' });
        const pending = await Shipment.countDocuments({ status: 'Pending' });
        const drivers = await Driver.countDocuments();
        
        // FETCH RECENT SHIPMENTS (This is what was missing for the chart/revenue!)
        const recentShipments = await Shipment.find().sort({ createdAt: -1 }).limit(10);

        res.json({
            vehicles,
            activeTrips,
            pending,
            drivers,
            recentShipments // The chart and table need this!
        });
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
});

// --- 2. AUTHENTICATION API ---

// --- UNIFIED REGISTRATION ROUTE ---
app.post('/api/register', async (req, res) => {
    try {
        const { fullName, email, phone, address, password } = req.body;
        
        // 1. Clean and validate email
        const cleanEmail = email.toLowerCase().trim();

        // 2. Check if user already exists
        const existing = await User.findOne({ email: cleanEmail });
        if (existing) {
            return res.status(400).json({ success: false, error: "Email already registered" });
        }

        // 3. SAVE to MongoDB
        const newUser = new User({ 
            fullName, 
            email: cleanEmail, 
            phone, 
            address, 
            password,
            role: 'customer' 
        });
        await newUser.save();
        console.log(`👤 New user saved: ${cleanEmail}`);

        // 4. SEND the Welcome Email
        const mailOptions = {
            from: '"TMS Pro Team" <parthivptl2003@gmail.com>', // Use your verified Gmail
            to: cleanEmail,
            subject: 'Welcome to TMS Pro! 🚚',
            html: `
                <div style="font-family: 'Plus Jakarta Sans', sans-serif; background: #0f172a; color: white; padding: 40px; border-radius: 20px;">
                    <h2 style="color: #3b82f6;">Welcome to TMS Pro, ${fullName}!</h2>
                    <p>Your administrative account has been successfully created.</p>
                    <p style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px;">
                        <b>Login ID:</b> ${cleanEmail}
                    </p>
                    <p>You can now manage your shipments and logistics directly from your dashboard.</p>
                    <br>
                    <p>Cheers,<br>The TMS Pro Team</p>
                </div>
            `
        };

        // Send email asynchronously
        transporter.sendMail(mailOptions).catch(err => console.error("📧 Email failed:", err));

        // 5. Send Success Response to Frontend
        res.status(200).json({ success: true, message: "Registration successful! Welcome email sent." });

    } catch (error) {
        console.error("❌ Registration Error:", error);
        res.status(500).json({ success: false, error: "Server error during registration." });
    }
});
app.post('/api/login', async (req, res) => {
    let { email, password } = req.body;
    email = email.toLowerCase().trim();

    if (email === "admin@gmail.com" && password === "admin123") {
        return res.json({ success: true, user: { name: "System Admin", role: "admin" } });
    }

    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
        return res.status(401).json({ success: false, error: "Invalid credentials" });
    }
    res.json({ success: true, user: { name: user.fullName, role: user.role } });
});

// --- 3. LOGISTICS LOGIC ---

app.get('/api/available-vehicles', async (req, res) => {
    res.json(await Vehicle.find({ status: 'Available' }));
});

app.put('/api/assign-shipment/:id', async (req, res) => {
    const { vehicleNumber } = req.body;
    await Shipment.findByIdAndUpdate(req.params.id, { assignedVehicle: vehicleNumber, status: 'In Transit' });
    await Vehicle.findOneAndUpdate({ vehicleNumber }, { status: 'On Trip' });
    res.json({ success: true });
});

app.put('/api/complete-shipment/:id', async (req, res) => {
    const shipment = await Shipment.findById(req.params.id);
    await Shipment.findByIdAndUpdate(req.params.id, { status: 'Delivered' });
    if (shipment.assignedVehicle !== 'Unassigned') {
        await Vehicle.findOneAndUpdate({ vehicleNumber: shipment.assignedVehicle }, { status: 'Available' });
    }
    res.json({ success: true });
});

app.get('/api/shipments', async (req, res) => {
    const { search } = req.query;
    let query = {};
    if (search) {
        query = { 
            $or: [
                { shipmentID: { $regex: search, $options: 'i' } },
                { customerName: { $regex: search, $options: 'i' } }
            ] 
        };
    }
    const shipments = await Shipment.find(query).sort({ createdAt: -1 });
    res.json(shipments);
});

// --- 4. GENERIC CRUD ---

app.get('/api/vehicles', async (req, res) => res.json(await Vehicle.find().sort({createdAt: -1})));
app.get('/api/drivers', async (req, res) => res.json(await Driver.find().sort({createdAt: -1})));
app.get('/api/users', async (req, res) => res.json(await User.find().sort({createdAt: -1})));

// Generic POST (Note: Specifically put shipments above this to avoid conflict)
app.post('/api/:collection', async (req, res) => {
    const { collection } = req.params;
    try {
        let Model;
        if (collection === 'vehicles') Model = Vehicle;
        else if (collection === 'drivers') Model = Driver;
        else if (collection === 'shipments') Model = Shipment;
        else return res.status(404).json({error: "Collection not found"});

        const doc = new Model(req.body);
        await doc.save();
        res.json({ success: true });
    } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

app.put('/api/:collection/:id', async (req, res) => {
    const { collection, id } = req.params;
    const Model = collection === 'vehicles' ? Vehicle : collection === 'drivers' ? Driver : (collection === 'users' ? User : Shipment);
    await Model.findByIdAndUpdate(id, req.body);
    res.json({ success: true });
});

app.delete('/api/:collection/:id', async (req, res) => {
    const { collection, id } = req.params;
    const Model = collection === 'vehicles' ? Vehicle : collection === 'drivers' ? Driver : (collection === 'users' ? User : Shipment);
    await Model.findByIdAndDelete(id);
    res.json({ success: true });
});


// --- 5. NAVIGATION ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));
// --- 5. NAVIGATION & FRONTEND ROUTES ---

// Route to serve the Login Page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html')); 
});

// Route to serve the Register Page
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/register.html'));
});

// Main Landing Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// --- SERVER START ---
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 TMS Server Running: http://localhost:${PORT}`);
});

