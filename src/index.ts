import server from "./api/server";
import dotenv from "dotenv";
dotenv.config();

console.log("Starting server");

const port = process.env.PORT || 3002;

async function main() {
    await server.listen(port);
    console.log(`Listening on port ${port}`);
}

main();
