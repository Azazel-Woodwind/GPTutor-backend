import { formatChat } from "./XUtils";



// const one = 1;
// const exampleText = `the number ${one}`




// function listImages(images) {
//     return images
//         .map((image, index) => {
//             return `Image #${index + 1}: ${image.description}`;
//         })
//         .join("\n");
// }



// const formatLesson = (lesson: Lesson) => {}



// const getJsonDataPrompt = (lesson: Lesson, history: Message[]) => `
// Here is information about a lesson that a teacher is teaching to the student:
// ${generateLessonInformation(lesson)}
// Here is the conversation history between the student and teacher:
// START
// ${formatChat(history)}
// END
// Your must respond with two values only and nothing more. The first value is ONLY the number of the learning objective that the teacher is most recently teaching to the student in the conversation history provided. The second value is ONLY "true" if and only if the lesson is finished, else "false" ONLY. The lesson is finished if and only if the teacher indicates that they would like to end the and the student confirms that they have no questions and would like to end the lesson. If the student has not confirmed that they are ready to start the lesson or not learning objective is being discussed, you must assume that the learning objective number is -1. You must separate each value by a single line break. Justify your choice.
// `;

// const getJsonDataPrompt = `
// Return ONLY a JSON object with two keys, 'learningObjectiveNumber' and 'finished'.
// If you do not have information you must ALWAYS assume learningObjectiveNumber is -1 and finished is false
// 'learningObjectiveNumber' should contain the learning objective number for the learning objective number that you were talking about last as an integer or -1 if the student has not confirmed that they are ready to start the lesson.
// 'finished' should contain a boolean which is true if your response is the final message of the lesson and the student has confirmed that they are happy to end the lesson, and false if not.
// `;

