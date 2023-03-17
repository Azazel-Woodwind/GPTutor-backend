const Joi = require('joi');

function validateUser(user) {
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
module.exports = { validateUser };
