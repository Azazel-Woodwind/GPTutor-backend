const Joi = require('joi');

function validateQuiz(quiz) {
  let pattern =
    /^([a-f]|[0-9]){8}-([a-f]|[0-9]){4}-([a-f]|[0-9]){4}-([a-f]|[0-9]){4}-([a-f]|[0-9]){12}$/gm;

  const schema = Joi.object({
    lesson_uuid: Joi.string()
      .required()
      .regex(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      )
      .message('Invalid Lesson UUID'),
    mcqs: Joi.number().required(),
    written: Joi.number().required(),
  });

  const result = schema.validate(quiz);
  return result;
}
module.exports = { validateQuiz };
