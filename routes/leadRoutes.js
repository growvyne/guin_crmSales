const express = require('express');
const router = express.Router();

const {
  getLeads,
  createLead,
  updateLead,
  deleteLead,
  getDashboardStats
} = require('../controllers/leadController');
const { bulkCreateLeads } = require('../controllers/leadBulkController'); // Excel import
const { protect } = require('../middleware/auth');

// Only admins may delete (this also covers "Clear all", which deletes lead by lead)
const adminOnly = (req, res, next) =>
  String(req.user?.role || '').toLowerCase() === 'admin'
    ? next()
    : res.status(403).json({ message: 'Only an admin can delete leads' });

router.use(protect); // Secure all lead routes

router.get('/', getLeads);                    // view      (admin + user)
router.post('/', createLead);                 // add       (admin + user)
router.post('/bulk', bulkCreateLeads);        // import    (admin + user)
router.get('/stats', getDashboardStats);      // dashboard (admin + user)
router.put('/:id', updateLead);               // edit      (admin + user)
router.delete('/:id', adminOnly, deleteLead); // delete    (admin only)

module.exports = router;