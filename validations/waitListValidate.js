const Joi = require('joi');

function waitListValidate(list) {
  const schema = Joi.object({
    name: Joi.string().required().max(50),
    email: Joi.string()
      .required()
      .email({
        minDomainSegments: 2,
        tlds: { allow: ['com', 'net'] },
      }),
    educational_level: Joi.string().required(),
    subject: Joi.string().required(),
  });

  const result = schema.validate(list);
  return result;
}

module.exports = { waitListValidate };
