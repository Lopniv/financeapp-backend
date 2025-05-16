const express = require('express');
const router = express.Router();
const {
  getAllTransactions,
  getTransactionsByWallet,
  getCategorySummaryByChoice,
  getMonthlySummary,
  getWalletSummary,
  getAllWalletSummary,
  addTransaction,
  transferBetweenWallets,
  updateTransaction,
  deleteTransaction,
} = require('../controllers/transactionController');

router.get('/', getAllTransactions);
router.get('/wallet/:walletId', getTransactionsByWallet); 
router.get('/category-summary/:walletId/:category', getCategorySummaryByChoice);
router.get('/summary/:walletId/:year/:month', getMonthlySummary);
router.get('/summary/:walletId', getWalletSummary);
router.get('/summary', getAllWalletSummary);
router.post('/', addTransaction);
router.post('/transfer', transferBetweenWallets);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;