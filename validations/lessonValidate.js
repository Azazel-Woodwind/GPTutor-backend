const Joi = require('joi');

function validateLesson(lesson) {
  const schema = Joi.object({
    title: Joi.string().required().max(50),
    educational_level: Joi.string().required(),
    subject: Joi.string().required(),
    topic: Joi.string().required(),
    quiz_type: Joi.string().required(),
    publish: Joi.boolean().required(),
    description: Joi.string().required(),
    lo1: Joi.string().required(),
    lo2: Joi.string().required(),
    lo3: Joi.string().required(),
    lo1_media: Joi.object().required(),
    lo2_media: Joi.object().required(),
    lo3_media: Joi.object().required(),
    lo1_description: Joi.string().required(),
    lo2_description: Joi.string().required(),
    lo3_description: Joi.string().required(),
  });

  const result = schema.validate(lesson);
  return result;
}
module.exports = { validateLesson };
