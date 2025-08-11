const express = require('express');
const router = express.Router();
const Activity = require('../persistence/activity');
const authorize = require('../middleware/authorize'); // middleware ตรวจสอบ role

// สร้างกิจกรรม (admin, president เท่านั้น)
router.post('/', authorize(['admin', 'president']), async (req, res) => {
  try {
    const activity = await Activity.create({
      title: req.body.title,
      description: req.body.description,
      start_date: req.body.start_date,
      end_date: req.body.end_date,
      created_by: req.user.id
    });
    res.status(201).json(activity);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create activity' });
  }
});

// ดึงกิจกรรมทั้งหมด (ทุกบทบาทดูได้)
router.get('/', async (req, res) => {
  try {
    const activities = await Activity.findAll();
    res.json(activities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to get activities' });
  }
});

// ดึงกิจกรรมตาม id
router.get('/:id', async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) return res.status(404).json({ message: 'Activity not found' });
    res.json(activity);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to get activity' });
  }
});

// แก้ไขกิจกรรม (admin, president)
router.put('/:id', authorize(['admin', 'president']), async (req, res) => {
  try {
    const activity = await Activity.update(req.params.id, req.body);
    if (!activity) return res.status(404).json({ message: 'Activity not found' });
    res.json(activity);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update activity' });
  }
});

// ลบกิจกรรม (admin เท่านั้น)
router.delete('/:id', authorize(['admin']), async (req, res) => {
  try {
    await Activity.delete(req.params.id);
    res.json({ message: 'Activity deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete activity' });
  }
});

module.exports = router;
