const {
  getAllLessons,
  createLesson,
  updateLesson,
  deleteLesson,
} = require('../controllers/lessons/lessonsController');
const express = require('express');
const router = express.Router();
const formidableMiddleware = require('express-formidable');

/***************************** For Form Data ******************************/
router.use(formidableMiddleware({
  encoding: 'utf-8',
  multiples: true, // req.files to be arrays of files
}));

/***************************** Get All Lesson ******************************/

router.get('/', getAllLessons);

/***************************** Create Lesson ******************************/

router.post('/', createLesson);

/***************************** Update Single Lesson ******************************/

router.put('/:id', updateLesson);

/***************************** Update Single Lesson ******************************/

router.delete('/:id', deleteLesson);

module.exports = router;
