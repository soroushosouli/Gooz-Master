import { queueMessage } from "../services/messageQueue.js";
import { formatHelp } from "../utils/format.js";

export async function helpCommand(ctx) {
    const message = formatHelp();
    
    await queueMessage(ctx, message, { parse_mode: "HTML" });
}
