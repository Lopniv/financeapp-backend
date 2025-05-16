const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const walletRoutes = require("./routes/walletRoutes");
const transactionRoutes = require("./routes/transactionRoutes");

const app = express();
const allowedOrigins = ["http://localhost:5173"]; // tambahkan domain frontend
app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));
app.use(express.json());

app.use("/api/wallets", walletRoutes);
app.use("/api/transactions", transactionRoutes);

// Optional: Handle root request
app.get("/", (req, res) => {
	res.send("API is running...");
});

const PORT = process.env.PORT || 5000;

mongoose
	.connect(process.env.MONGO_URI)
	.then(() => {
		console.log("Connected to MongoDB");
		app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
	})
	.catch((err) => console.log(err));
