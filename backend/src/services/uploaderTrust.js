const prisma = require('../prisma');

/**
 * Decides whether an uploader has earned the right to publish paid notes
 * without waiting for review.
 *
 * Trust is COMPUTED from review history rather than stored as a flag. That
 * matters: a stored flag has to be revoked by something remembering to revoke
 * it, whereas a computed one drops away by itself the moment a note is
 * rejected. There is no state to drift out of step with reality.
 *
 * The window is what makes it recoverable in both directions — one bad note
 * costs a tutor their standing, but it ages out once they have submitted
 * enough good ones after it, rather than marking them permanently.
 */
const TRUST = {
    windowSize: 10,      // how many recent decisions count
    minApproved: 3,      // approvals needed within that window
    maxRejected: 0,      // any rejection in the window withdraws trust
};

/**
 * @returns {Promise<{trusted: boolean, reason: string, stats: object}>}
 */
async function assessUploaderTrust(userId) {
    const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { role: true, tutors: { select: { review_exempt: true, status: true } } },
    });

    if (user?.role === 'admin') {
        return { trusted: true, reason: 'Admin', stats: {} };
    }

    // An explicit decision by an admin overrides the earned status in both
    // directions: `false` keeps someone in review despite a clean record,
    // `true` grants trust before they would otherwise have earned it.
    const exempt = user?.tutors?.review_exempt;
    if (exempt === false) {
        return { trusted: false, reason: 'Review required by an administrator', stats: {} };
    }
    if (exempt === true) {
        return { trusted: true, reason: 'Trusted by an administrator', stats: {} };
    }

    const recent = await prisma.premium_notes.findMany({
        where: { uploaded_by: userId, review_status: { in: ['approved', 'rejected'] } },
        select: { review_status: true },
        orderBy: { created_at: 'desc' },
        take: TRUST.windowSize,
    });

    const approved = recent.filter(n => n.review_status === 'approved').length;
    const rejected = recent.filter(n => n.review_status === 'rejected').length;
    const stats = { approved, rejected, windowSize: TRUST.windowSize, ...TRUST };

    if (rejected > TRUST.maxRejected) {
        return {
            trusted: false,
            reason: `A recent submission was rejected. Trust returns after ${TRUST.windowSize} newer decisions with none rejected.`,
            stats,
        };
    }
    if (approved < TRUST.minApproved) {
        return {
            trusted: false,
            reason: `${approved} of ${TRUST.minApproved} approvals needed before notes publish without review.`,
            stats,
        };
    }

    return {
        trusted: true,
        reason: `${approved} approved submissions and no rejections`,
        stats,
    };
}

module.exports = { assessUploaderTrust, TRUST };
