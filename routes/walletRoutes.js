const express = require('express');
const router = express.Router();
const { getWallets, addWallet } = require('../controllers/walletController');

router.get('/', getWallets);
router.post('/', addWallet);

module.exports = router;
