const queue = [];

let processing = false;

const MESSAGE_DELAY = 1100;


function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}


async function processQueue() {

    if (processing) {
        return;
    }

    processing = true;

    while (queue.length > 0) {

        const {
            ctx,
            text,
            options,
            resolve,
            reject
        } = queue.shift();

        try {

            const result =
                await ctx.reply(
                    text,
                    options
                );

            resolve(result);

        } catch (error) {

            reject(error);

        }

        if (queue.length > 0) {
            await sleep(MESSAGE_DELAY);
        }
    }

    processing = false;
}


export function queueMessage(
    ctx,
    text,
    options = {}
) {
    return new Promise((resolve, reject) => {

        queue.push({
            ctx,
            text,
            options,
            resolve,
            reject
        });

        processQueue();
    });
}