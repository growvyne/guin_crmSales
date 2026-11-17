const express = require('express');
const router = express.Router();
const { 
    getLeads, 
    createLead, 
    updateLead, 
    deleteLead, 
    getDashboardStats 
} = require('../controllers/leadController');
const { protect } = require('../middleware/auth');

router.use(protect); // Secure all lead routes

router.get('/', getLeads);
router.post('/', createLead);
router.get('/stats', getDashboardStats);
router.put('/:id', updateLead);
router.delete('/:id', deleteLead);

module.exports = router;