function extractText() {
    return document.body.innerText;
}

function summarizeText(text) {
    const sentences = text.match(/[^.!?]+[.!?]/g) || [];
    if (sentences.length === 0) return "No summary available.";
    
    const tfidf = {}; // Simple TF-IDF for scoring sentences
    const words = text.split(/\s+/);
    words.forEach(word => {
        tfidf[word] = (tfidf[word] || 0) + 1;
    });

    const scores = sentences.map(sentence => {
        return { sentence, score: sentence.split(/\s+/).reduce((sum, word) => sum + (tfidf[word] || 0), 0) };
    });
    
    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, 3).map(s => s.sentence).join(" ");
}

const text = extractText();
const summary = summarizeText(text);
alert(summary);
