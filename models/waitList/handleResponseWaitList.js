class handleResponse {
  createWaitList = (body) => {
    const { name, email, educational_level, subject } = body;
    let createList = {
      name: name,
      email: email,
      educational_level: educational_level,
      subject: subject,
    };
    return createList;
  };
}
const HandleResponse = new handleResponse();
module.exports = HandleResponse;
