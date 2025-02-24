async function summarizeText(text) {
    console.log("Extracted Text:", text); // Debugging log

    const sentences = text.match(/[^.!?]+[.!?]/g) || [];
    if (sentences.length === 0) {
        console.log("No valid sentences found.");
        return ["No summary available."];
    }

    const tfidf = {};
    const words = text.split(/\s+/);
    words.forEach(word => {
        tfidf[word] = (tfidf[word] || 0) + 1;
    });

    const scores = sentences.map(sentence => ({
        sentence,
        score: sentence.split(/\s+/).reduce((sum, word) => sum + (tfidf[word] || 0), 0),
    }));

    scores.sort((a, b) => b.score - a.score);
    const summaryList = scores.slice(0, 5).map(s => s.sentence.trim());

    console.log("Generated Summary:", summaryList); // Debugging log
    return summaryList;
}

function extractText() {
    try {
        let textSections = [];

    
        // Select only meaningful content
        document.querySelectorAll('article, main, section, p').forEach(el => {
            if (
                el.innerText.length > 50 &&  // Ignore very short text
                !el.closest('nav, footer, aside, header, form, script, style, button, svg') // Exclude irrelevant sections
            ) {
                textSections.push(el.innerText.trim());
            }
        });

        // If no useful text is found, fallback to full document text
        let fullText = document.documentElement.innerText.trim();
        if (textSections.length === 0) {
            textSections.push(fullText);
        }

        // Remove common UI text from search engines and web apps
        const bannedPhrases = [
            "About Advertising Business",
            "Privacy Terms",
            "Search settings",
            "Your data in Search",
            "Advanced search",
            "How Search works",
            "Send feedback"
        ];

        let filteredText = textSections
            .join("\n\n")
            .split("\n")
            .filter(line => 
                line.length > 30 && // Avoid very short text
                !bannedPhrases.some(phrase => line.includes(phrase)) // Remove unwanted lines
            )
            .join("\n");

        // If the filtered text is empty or too short, return a fallback message
        if (!filteredText || filteredText.trim().length < 50) {
            return "No relevant content available for summarization.";
        }

        return filteredText;
    } catch (error) {
        console.error("Text Extraction Error:", error.message);
        return `Error extracting text: ${error.message}`;
    }
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
