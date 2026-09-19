import { goozes } from "../data/goozes.js";


export function getRandomGooz() {


    const totalWeight = goozes.reduce(
        (sum, gooz) => sum + gooz.weight,
        0
    );


    let random =
        Math.random() * totalWeight;


    for (const gooz of goozes) {


        random -= gooz.weight;


        if (random <= 0) {

            return gooz;

        }

    }


    return goozes[goozes.length - 1];

}