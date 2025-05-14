const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
	walletId: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet" },
	amount: { type: Number, required: true },
	type: {
		type: String,
		enum: ["income", "expense", "transfer"],
		required: true,
	},
	category: { 
		type: String,
		enum: ["salary", "food & drink", "transport", "entertainment", "transfer", "transferout", "transferin", "other"],
		required: true 
	},
	note: { type: String, required: true },
	date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Transaction", transactionSchema);
