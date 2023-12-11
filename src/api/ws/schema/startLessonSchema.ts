import { z } from "zod";

const schema = z.object({
    lessonID: z.string({
        required_error: "Lesson ID is required",
    }),
});

export default schema;
