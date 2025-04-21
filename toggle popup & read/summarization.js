function extractText() {
    try {
        let textSections = [];

        document.querySelectorAll('article, main, section, p').forEach(el => {
            if (
                el.innerText.length > 50 &&
                !el.closest('nav, footer, aside, header, form, script, style, button, svg')
            ) {
                textSections.push(el.innerText.trim());
            }
        });

        let fullText = document.documentElement.innerText.trim();
        if (textSections.length === 0) {
            textSections.push(fullText);
        }

        const bannedPhrases = [
            "About Advertising Business",
            "Privacy Terms",
            "Search settings",
            "Your data in Search",
            "Advanced search",
            "How Search works",
            "Send feedback"
        ];

        let currentDomain = window.location.hostname.replace("www.", "").split(".")[0];
        bannedPhrases.push(currentDomain.charAt(0).toUpperCase() + currentDomain.slice(1));
        bannedPhrases.push(currentDomain.toLowerCase());
        
        let filteredText = textSections
            .join("\n\n")
            .split("\n")
            .filter(line => 
                line.length > 30 &&
                !bannedPhrases.some(phrase => line.includes(phrase))
            )
            .join("\n");

        if (!filteredText || filteredText.trim().length < 50) {
            return "No relevant content available for summarization.";
        }

        return filteredText;
    } catch (error) {
        console.error("Text Extraction Error:", error.message);
        return `Error extracting text: ${error.message}`;
    }
}

async function summarizeText(text) {
    console.log("Extracted Text:", text);

    const sentences = text.match(/[^.!?]+[.!?]/g) || [];
    if (sentences.length === 0) {
        console.log("No valid sentences found.");
        return ["No summary available."];
    }

    const words = text.split(/\s+/);
    const tfidf = {};
    words.forEach(word => {
        tfidf[word] = (tfidf[word] || 0) + 1;
    });

    const dtMatrix = sentences.map(sentence => 
        sentence.split(/\s+/).map(word => tfidf[word] || 0)
    );
    
    const similarityMatrix = dtMatrix.map(row => 
        dtMatrix.map(col => row.reduce((sum, val, i) => sum + val * col[i], 0))
    );

    const scores = new Array(sentences.length).fill(1);
    const d = 0.85, maxIter = 100, tol = 1e-5;
    for (let iter = 0; iter < maxIter; iter++) {
        let newScores = new Array(sentences.length).fill(0);
        let diff = 0;
        
        similarityMatrix.forEach((row, i) => {
            row.forEach((val, j) => {
                if (i !== j) {
                    newScores[i] += d * (val * scores[j]);
                }
            });
            newScores[i] += (1 - d);
            diff += Math.abs(newScores[i] - scores[i]);
        });
        
        scores.splice(0, scores.length, ...newScores);
        if (diff < tol) break;
    }

    const rankedSentences = scores.map((score, index) => ({ score, index }))
                                 .sort((a, b) => b.score - a.score);

    const topSentences = rankedSentences.slice(0, 10).map(s => sentences[s.index].trim());
    
    console.log("Generated Summary:", topSentences);
    return topSentences;
}

(async function () {
    const text = extractText();
    if (!text || text.trim().length < 20) {
        console.log("Extracted text is too short or empty.");
        return;
    }

    const summaryList = await summarizeText(text);
    chrome.runtime.sendMessage({ summary: summaryList });
})();



