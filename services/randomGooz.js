import { goozes } from "../data/goozes.js";
import db from "../database/db.js";

// Prepared statements for checking Pepper effect
const statements = {
    getPepperEffect: null
};

function initStatements() {
    if (statements.getPepperEffect) return;
    statements.getPepperEffect = db.prepare(`SELECT expires_at FROM active_effects WHERE user_id = ? AND item_key = 'pepper'`);
}

export function getRandomGooz(userId = null) {
    initStatements();
    
    // Check if user has active Pepper effect
    let hasPepper = false;
    if (userId) {
        const effect = statements.getPepperEffect.get(userId);
        if (effect) {
            const expiresAt = new Date(effect.expires_at).getTime();
            if (expiresAt > Date.now()) {
                hasPepper = true;
            } else {
                // Clean up expired effect
                db.prepare(`DELETE FROM active_effects WHERE user_id = ? AND item_key = 'pepper'`).run(userId);
            }
        }
    }
    
    let totalWeight;
    
    if (hasPepper) {
        // Pepper increases chance of stronger/rarer goozes by 20%
        // We do this by reducing weights of weaker goozes (power < 5) by 20%
        // and keeping stronger ones the same, effectively increasing their relative probability
        
        // Calculate adjusted weights
        const adjustedWeights = goozes.map(gooz => {
            if (gooz.power < 5) {
                // Weaker goozes get 20% less weight
                return gooz.weight * 0.8;
            }
            return gooz.weight;
        });
        
        totalWeight = adjustedWeights.reduce((sum, weight) => sum + weight, 0);
        
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < goozes.length; i++) {
            random -= adjustedWeights[i];
            if (random <= 0) {
                return goozes[i];
            }
        }
        
        return goozes[goozes.length - 1];
    } else {
        // Normal weighted random selection
        totalWeight = goozes.reduce(
            (sum, gooz) => sum + gooz.weight,
            0
        );
        
        let random = Math.random() * totalWeight;
        
        for (const gooz of goozes) {
            random -= gooz.weight;
            if (random <= 0) {
                return gooz;
            }
        }
        
        return goozes[goozes.length - 1];
    }
}