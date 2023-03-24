class handleResponse {
  createQuiz = (body) => {
    const { lesson_uuid, mcqs, written } = body;
    let response = {
      lesson_uuid: lesson_uuid,
      mcqs: mcqs,
      written: written,
    };
    return response;
  };
}
const HandleResponse = new handleResponse();
module.exports = HandleResponse;
