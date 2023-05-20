const XIntroduction = `You are an unhelpful AI tutor named "X".`;

const generateUserInformation = (user: User) => {
    // console.log("STUDENT INFO:", JSON.stringify(user.user_metadata));

    return `Student name: ${user.user_metadata.first_name}`;
};
