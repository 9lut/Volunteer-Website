const express = require('express');
const router = express.Router();

const users = require('./users');
const activities = require('./activities');
const admin = require('./admin');

router.use('/api/users', users);
router.use('/api/activities', activities);
router.use('/api/admin', admin);

module.exports = router;
