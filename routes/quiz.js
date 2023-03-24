const express = require('express');
const {
  getAllQuiz,
  addNewQuiz,
  updateQuiz,
  deleteQuiz,
} = require('../controllers/quiz/quizController');
const router = express.Router();

/***************************** Get All Quiz ******************************/
router.get('/', getAllQuiz);

/***************************** Add New Quiz ******************************/

router.post('/', addNewQuiz);

/***************************** Update  Quiz ******************************/

router.put('/:id', updateQuiz);

/***************************** Delete Quiz ******************************/

router.delete('/:id', deleteQuiz);

module.exports = router;
