const Transaction = require("../models/Transaction");
const Wallet = require("../models/Wallet");
const mongoose = require("mongoose");

// GET transactions
exports.getAllTransactions = async (req, res) => {
	try {
		const { year, month } = req.query;

		const filter = {};

		// Jika ada filter tahun dan bulan
		if (year && month) {
			const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
			const endDate = new Date(parseInt(year), parseInt(month), 1);
			filter.date = { $gte: startDate, $lt: endDate };
		}

		const transactions = await Transaction.find(filter).sort({ date: -1 });
		res.json(transactions);
	} catch (err) {
		console.error("Get All Transactions Error:", err.message);
		res.status(500).json({ error: "Gagal mengambil semua transaksi" });
	}
};

// GET transactions by wallet
exports.getTransactionsByWallet = async (req, res) => {
	const { walletId } = req.params;

	try {
		const transactions = await Transaction.find({ walletId }).sort({
			date: -1,
		});
		res.json(transactions);
	} catch (err) {
		res.status(500).json({ error: "Gagal mengambil transaksi" });
	}
};

// GET transactions by category and date range
exports.getCategorySummaryByChoice = async (req, res) => {
	try {
		const { walletId, category } = req.params;
		const { year, month } = req.query;

		if (!mongoose.Types.ObjectId.isValid(walletId)) {
			return res.status(400).json({ error: "ID dompet tidak valid" });
		}

		const matchFilter = {
			walletId: new mongoose.Types.ObjectId(walletId),
			category,
		};

		// Jika ada query year dan month, filter tanggal
		if (year && month) {
			const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
			const endDate = new Date(parseInt(year), parseInt(month), 1);
			matchFilter.date = { $gte: startDate, $lt: endDate };
		}

		const summary = await Transaction.aggregate([
			{ $match: matchFilter },
			{
				$group: {
					_id: "$type", // 'income' atau 'expense'
					total: { $sum: "$amount" },
				},
			},
		]);

		let income = 0;
		let expense = 0;

		summary.forEach((item) => {
			if (item._id === "income") income = item.total;
			if (item._id === "expense") expense = item.total;
		});

		res.json({
			category,
			income,
			expense,
		});
	} catch (err) {
		console.error("Category Summary Error:", err.message);
		res.status(500).json({
			error: "Gagal mengambil rekap transaksi berdasarkan kategori",
		});
	}
};

// GET transactions by wallet and date range
exports.getMonthlySummary = async (req, res) => {
	const { walletId, year, month } = req.params;

	try {
		const startDate = new Date(year, month - 1, 1);
		const endDate = new Date(year, month, 1); // bulan berikutnya

		const income = await mongoose.model("Transaction").aggregate([
			{
				$match: {
					walletId: new mongoose.Types.ObjectId(walletId),
					type: "income",
					date: { $gte: startDate, $lt: endDate },
				},
			},
			{
				$group: {
					_id: null,
					total: { $sum: "$amount" },
				},
			},
		]);

		const expense = await mongoose.model("Transaction").aggregate([
			{
				$match: {
					walletId: new mongoose.Types.ObjectId(walletId),
					type: "expense",
					date: { $gte: startDate, $lt: endDate },
				},
			},
			{
				$group: {
					_id: null,
					total: { $sum: "$amount" },
				},
			},
		]);

		res.json({
			month: `${year}-${month.padStart ? month.padStart(2, "0") : month}`,
			income: income[0]?.total || 0,
			expense: expense[0]?.total || 0,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Gagal mengambil rekap bulanan" });
	}
};

// GET summary of transactions
exports.getWalletSummary = async (req, res) => {
	const { walletId } = req.params;

	try {
		const income = await Transaction.aggregate([
			{
				$match: {
					walletId: new mongoose.Types.ObjectId(walletId),
					type: "income",
				},
			},
			{ $group: { _id: null, total: { $sum: "$amount" } } },
		]);

		const expense = await Transaction.aggregate([
			{
				$match: {
					walletId: new mongoose.Types.ObjectId(walletId),
					type: "expense",
				},
			},
			{ $group: { _id: null, total: { $sum: "$amount" } } },
		]);

		res.json({
			income: income[0]?.total || 0,
			expense: expense[0]?.total || 0,
		});
	} catch (err) {
		res.status(500).json({ error: "Gagal mengambil rekap transaksi" });
	}
};

// GET all wallet summary of transactions
exports.getAllWalletSummary = async (req, res) => {
	try {
		const income = await Transaction.aggregate([
			{
				$match: {
					type: "income",
				},
			},
			{ $group: { _id: null, total: { $sum: "$amount" } } },
		]);

		const expense = await Transaction.aggregate([
			{
				$match: {
					type: "expense",
				},
			},
			{ $group: { _id: null, total: { $sum: "$amount" } } },
		]);

		res.json({
			income: income[0]?.total || 0,
			expense: expense[0]?.total || 0,
		});
	} catch (err) {
		res.status(500).json({ error: "Gagal mengambil rekap transaksi" });
	}
};

// POST new transaction
exports.addTransaction = async (req, res) => {
	const { walletId, amount, type, category, note, date } = req.body;

	// Simpan transaksi
	const transaction = new Transaction({
		walletId,
		amount,
		type,
		category,
		note,
		date,
	});
	await transaction.save();

	// Update saldo dompet
	const wallet = await Wallet.findById(walletId);
	if (type === "income") {
		wallet.balance += amount;
	} else if (type === "expense") {
		wallet.balance -= amount;
	}
	await wallet.save();

	res.status(201).json(transaction);
};

// POST transfer between wallets
exports.transferBetweenWallets = async (req, res) => {
	const { fromWalletId, toWalletId, amount, category, note, date } = req.body;

	try {
		const fromWallet = await Wallet.findById(fromWalletId);
		const toWallet = await Wallet.findById(toWalletId);

		if (!fromWallet || !toWallet) {
			return res.status(404).json({ error: "Dompet tidak ditemukan" });
		}

		if (fromWallet.balance < amount) {
			return res
				.status(400)
				.json({ error: "Saldo dompet asal tidak mencukupi" });
		}

		// 1. Kurangi saldo dompet asal
		fromWallet.balance -= amount;

		// 2. Tambah saldo dompet tujuan
		toWallet.balance += amount;

		await fromWallet.save();
		await toWallet.save();

		// 3. Buat transaksi expense di dompet asal
		const fromTransaction = new Transaction({
			walletId: fromWalletId,
			amount,
			type: "expense",
			category: "transferout",
			note: note || `Transfer to ${toWallet.name}`,
			date,
		});

		// 4. Buat transaksi income di dompet tujuan
		const toTransaction = new Transaction({
			walletId: toWalletId,
			amount,
			type: "income",
			category: "transferin",
			note: note || `Transfer from ${fromWallet.name}`,
			date,
		});

		await fromTransaction.save();
		await toTransaction.save();

		res.status(201).json({ message: "Transfer berhasil" });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Terjadi kesalahan saat transfer" });
	}
};

// UPDATE transaction
exports.updateTransaction = async (req, res) => {
	const { id } = req.params;
	const { amount, type, category, note, date } = req.body;

	try {
		const transaction = await Transaction.findById(id);
		if (!transaction) {
			return res
				.status(404)
				.json({ error: "Can't find the transaction" });
		}

		const wallet = await Wallet.findById(transaction.walletId);
		if (!wallet) {
			return res.status(404).json({ error: "Wallet not found" });
		}

		// 1. Batalkan efek saldo lama
		if (transaction.type === "income") {
			wallet.balance -= transaction.amount;
		} else if (transaction.type === "expense") {
			wallet.balance += transaction.amount;
		}

		// 2. Update data transaksi
		transaction.amount = amount;
		transaction.type = type;
		transaction.category = category;
		transaction.note = note;
		transaction.date = date;

		await transaction.save();

		// 3. Terapkan efek saldo baru
		if (transaction.type === "income") {
			wallet.balance += transaction.amount;
		} else if (transaction.type === "expense") {
			wallet.balance -= transaction.amount;
		}

		await wallet.save();

		res.json(transaction);
	} catch (err) {
		res.status(500).json({ error: "Gagal memperbarui transaksi" });
	}
};

// DELETE transaction
exports.deleteTransaction = async (req, res) => {
	const { id } = req.params;

	try {
		const transaction = await Transaction.findById(id);
		if (!transaction) {
			return res.status(404).json({ error: "Transaksi tidak ditemukan" });
		}

		const wallet = await Wallet.findById(transaction.walletId);
		if (!wallet) {
			return res.status(404).json({ error: "Dompet tidak ditemukan" });
		}

		// Kembalikan saldo dompet
		if (transaction.type === "income") {
			wallet.balance -= transaction.amount;
		} else if (transaction.type === "expense") {
			wallet.balance += transaction.amount;
		}
		await wallet.save();

		// Hapus transaksi
		await transaction.deleteOne();

		res.json({ message: "Transaksi berhasil dihapus" });
	} catch (err) {
		res.status(500).json({ error: "Gagal menghapus transaksi" });
	}
};
