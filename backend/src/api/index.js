const express = require('express');
const router = express.Router();

const user = require('./user');
const activities = require('./activities');

router.use('/api/users', user);
router.use('/api/activities', activities);

module.exports = router;
