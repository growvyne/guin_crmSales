const Lead = require('../models/Lead');

// Get Leads (Admin sees all, User sees own) + Search & Filter
exports.getLeads = async (req, res) => {
    try {
        const { search, status } = req.query;
        let query = req.user.role === 'admin' ? {} : { user: req.user.id };

        if (status) query.status = status;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const leads = await Lead.find(query).populate('user', 'name email').sort({ createdAt: -1 });
        res.json(leads);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create Lead
exports.createLead = async (req, res) => {
    try {
        const lead = await Lead.create({ ...req.body, user: req.user.id });
        res.status(201).json(lead);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update Lead
exports.updateLead = async (req, res) => {
    try {
        let lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ error: 'Lead not found' });

        if (req.user.role !== 'admin' && lead.user.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized to update this lead' });
        }

        lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(lead);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete Lead
exports.deleteLead = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ error: 'Lead not found' });

        if (req.user.role !== 'admin' && lead.user.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized to delete this lead' });
        }

        await lead.deleteOne();
        res.json({ message: 'Lead removed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Dashboard Metrics & Reminders
exports.getDashboardStats = async (req, res) => {
    try {
        let query = req.user.role === 'admin' ? {} : { user: req.user.id };
        
        const totalLeads = await Lead.countDocuments(query);
        const activeLeads = await Lead.countDocuments({ ...query, status: { $nin: ['Won', 'Lost'] } });
        const convertedLeads = await Lead.countDocuments({ ...query, status: 'Won' });
        
        const today = new Date();
        const pendingReminders = await Lead.countDocuments({
            ...query,
            nextFollowUp: { $lte: today },
            status: { $nin: ['Won', 'Lost'] }
        });

        res.json({ totalLeads, activeLeads, convertedLeads, pendingReminders });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};