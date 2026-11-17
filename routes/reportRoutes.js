const express = require('express');
const router = express.Router();
const { getReports } = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.use(protect); // Secure report endpoints

router.get('/', getReports);

module.exports = router;