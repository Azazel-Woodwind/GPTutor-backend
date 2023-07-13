export const generateDataPrompt = ({
    definitions,
    start,
}: {
    definitions: { [key: string]: string };
    start?: boolean;
}) => `
At the ${
    start ? "start" : "end"
} of your response, you must include information about your response enclosed in triple quotation marks ("""). This information must be valid JSON and must include the following keys:

${Object.entries(definitions)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n")}

Do not use triple quotation marks anywhere else in your response.
`;
