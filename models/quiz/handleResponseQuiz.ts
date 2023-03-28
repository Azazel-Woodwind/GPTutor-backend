// @ts-nocheck
class HandleResponse {
    createQuiz = body => {
        const { lesson_uuid, mcqs, written } = body;
        let response = {
            lesson_uuid: lesson_uuid,
            mcqs: mcqs,
            written: written,
        };
        return response;
    };
}

export default new HandleResponse();
