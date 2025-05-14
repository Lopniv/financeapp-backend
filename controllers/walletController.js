const Wallet = require("../models/Wallet");

exports.getWallets = async (req, res) => {
	const wallets = await Wallet.find();
	res.json(wallets);
};

exports.addWallet = async (req, res) => {
	const { name, balance } = req.body;
	const newWallet = new Wallet({ name, balance });
	await newWallet.save();
	res.status(201).json(newWallet);
};
