const Lead = require('../models/Lead');

exports.getLeads = async (req, res) => {
    try {
        const { search, status, category } = req.query;

        let query = req.user.role === 'admin'
            ? {}
            : { user: req.user.id };

        if (status) {
            query.status = status;
        }

        if (category) {
            query.category = category;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { address: { $regex: search, $options: 'i' } },
                { website: { $regex: search, $options: 'i' } }
            ];
        }

        const leads = await Lead.find(query)
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            count: leads.length,
            leads
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};


// CREATE LEAD
exports.createLead = async (req, res) => {
    try {
        // console.log("========== INCOMING LEAD ==========");
        // console.log("Category:", req.body.category);
        // console.log("Website:", req.body.website);
        // console.log("FollowUp Message:", req.body.followUpMessage);
        // console.log("Full Body:", req.body);

        const lead = await Lead.create({
            ...req.body,
            user: req.user.id
        });

        // console.log("========== SAVED LEAD ==========");
        // console.log("Category:", lead.category);
        // console.log("Website:", lead.website);
        // console.log("FollowUp Message:", lead.followUpMessage);

        const savedLead = await Lead.findById(lead._id)
            .populate('user', 'name email')
            .lean();

        res.status(201).json({
            success: true,
            message: 'Lead created successfully',
            lead: savedLead
        });

    } catch (error) {
        console.error("CREATE LEAD ERROR:", error);

        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// UPDATE LEAD
exports.updateLead = async (req, res) => {
    try {
        let lead = await Lead.findById(req.params.id);

        if (!lead) {
            return res.status(404).json({
                success: false,
                error: 'Lead not found'
            });
        }

        if (
            req.user.role !== 'admin' &&
            lead.user.toString() !== req.user.id
        ) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized to update this lead'
            });
        }

        const { user, ...updateData } = req.body;

        lead = await Lead.findByIdAndUpdate(
            req.params.id,
            updateData,
            {
                new: true,
                runValidators: true
            }
        ).populate('user', 'name email');

        res.status(200).json({
            success: true,
            message: 'Lead updated successfully',
            lead
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};


// DELETE LEAD
exports.deleteLead = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);

        if (!lead) {
            return res.status(404).json({
                success: false,
                error: 'Lead not found'
            });
        }

        if (
            req.user.role !== 'admin' &&
            lead.user.toString() !== req.user.id
        ) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized to delete this lead'
            });
        }

        await lead.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Lead removed successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};


// DASHBOARD METRICS
exports.getDashboardStats = async (req, res) => {
    try {
        const query = req.user.role === 'admin'
            ? {}
            : { user: req.user.id };

        const totalLeads = await Lead.countDocuments(query);

        const activeLeads = await Lead.countDocuments({
            ...query,
            status: { $nin: ['Won', 'Lost'] }
        });

        const convertedLeads = await Lead.countDocuments({
            ...query,
            status: 'Won'
        });

        const today = new Date();

        const pendingReminders = await Lead.countDocuments({
            ...query,
            nextFollowUp: { $lte: today },
            status: { $nin: ['Won', 'Lost'] }
        });

        res.status(200).json({
            success: true,
            totalLeads,
            activeLeads,
            convertedLeads,
            pendingReminders
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};