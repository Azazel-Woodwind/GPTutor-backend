const Joi = require('joi');

function validateSASignUp(admin) {
  const schema = Joi.object({
    first_name: Joi.string().required(),
    last_name: Joi.string().required(),
    role: Joi.string().required(),
    email: Joi.string()
      .required()
      .email({
        minDomainSegments: 2,
        tlds: { allow: ['com', 'net'] },
      }),
    password: Joi.string().required().min(5).max(15),
  });

  const result = schema.validate(admin);
  return result;
}

function validateSALogin(admin) {
  const schema = Joi.object({
    email: Joi.string()
      .required()
      .email({
        minDomainSegments: 2,
        tlds: { allow: ['com', 'net'] },
      }),
    password: Joi.string().required().min(5).max(15),
  });

  const result = schema.validate(admin);
  return result;
}

module.exports = { validateSASignUp, validateSALogin };
