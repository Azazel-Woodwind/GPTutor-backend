const Joi = require('joi');

function validateAdminSignUp(user) {
  const schema = Joi.object({
    name: Joi.string().required().min(3).max(20),
    password: Joi.string().required().min(5).max(15),
    email: Joi.string()
      .required()
      .email({
        minDomainSegments: 2,
        tlds: { allow: ['com', 'net'] },
      }),
    phone_number: Joi.string().required().max(15),
    educational_level: Joi.string().required(),
    main_subjects: Joi.string().required(),
  });

  const result = schema.validate(user);
  return result;
}

function validateAdminLogin(user) {
  const schema = Joi.object({
    password: Joi.string().required(),
    email: Joi.string()
      .required()
      .email({
        minDomainSegments: 2,
        tlds: { allow: ['com', 'net'] },
      }),
  });

  const result = schema.validate(user);
  return result;
}

module.exports = { validateAdminSignUp, validateAdminLogin };
