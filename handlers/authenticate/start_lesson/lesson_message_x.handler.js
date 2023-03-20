const lesson_message_xHandler = async (data, socket) => {
    await data.completeChat({ message: data.message });
};

module.exports = lesson_message_xHandler;
