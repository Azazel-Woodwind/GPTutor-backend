import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
// const { SESv2Client, SendEmailCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import

interface Props {
    to: string;
    from: string;
    subject: string;
    html: string;
}

async function sendEmail({ to, from, subject, html }: Props) {
    const client = new SESv2Client({ region: "eu-west-2" });
    const input = {
        // SendEmailRequest
        FromEmailAddress: from,
        Destination: {
            // Destination
            ToAddresses: [
                // EmailAddressList
                to,
            ],
        },
        Content: {
            // EmailContent
            Simple: {
                // Message
                Subject: {
                    // Content
                    Data: subject, // required
                    Charset: "utf-8",
                },
                Body: {
                    // Body
                    Text: {
                        Data: html, // required
                        Charset: "utf-8",
                    },
                    Html: {
                        Data: html, // required
                        Charset: "utf-8",
                    },
                },
            },
        },
    };
    const command = new SendEmailCommand(input);
    const response = await client.send(command);

    return response;
}

export default sendEmail;
