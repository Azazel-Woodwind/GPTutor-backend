import server from "./server";
import dotenv from "dotenv";
dotenv.config();

const port = process.env.PORT || 3002;

async function main() {
    await server.listen(port);
    console.log(`Listening on port ${port}`);
}

main();
