// @ts-nocheck
const lesson_message_xHandler = async (data, socket) => {
    await data.completeChat({ message: data.message });
};

export default lesson_message_xHandler;
