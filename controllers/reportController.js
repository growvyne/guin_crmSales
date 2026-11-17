const Lead = require('../models/Lead');
const mongoose = require('mongoose');

// Get Sales Reports & Conversion Analytics
exports.getReports = async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin';
        const matchQuery = isAdmin ? {} : { user: new mongoose.Types.ObjectId(req.user.id) };

        // 1. Status breakdown counts
        const statusBreakdown = await Lead.aggregate([
            { $match: matchQuery },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        // 2. Overall conversion metrics
        const totalLeads = await Lead.countDocuments(isAdmin ? {} : { user: req.user.id });
        const wonLeads = await Lead.countDocuments({ ...(isAdmin ? {} : { user: req.user.id }), status: 'Won' });
        const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(2) : 0;

        // 3. Admin-only: Performance breakdown by user
        let userPerformance = [];
        if (isAdmin) {
            userPerformance = await Lead.aggregate([
                {
                    $group: {
                        _id: '$user',
                        totalLeads: { $sum: 1 },
                        wonLeads: {
                            $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] }
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'userInfo'
                    }
                },
                { $unwind: '$userInfo' },
                {
                    $project: {
                        name: '$userInfo.name',
                        email: '$userInfo.email',
                        totalLeads: 1,
                        wonLeads: 1,
                        conversionRate: {
                            $cond: [
                                { $eq: ['$totalLeads', 0] },
                                0,
                                { $round: [{ $multiply: [{ $divide: ['$wonLeads', '$totalLeads'] }, 100] }, 2] }
                            ]
                        }
                    }
                }
            ]);
        }

        res.json({
            summary: {
                totalLeads,
                wonLeads,
                conversionRate: `${conversionRate}%`
            },
            statusBreakdown,
            userPerformance
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};