console.log("AI Summary Extension Loaded!");

// chrome.runtime.sendMessage({ action: "generateSummary" }, (response) => {
//   if (chrome.runtime.lastError) {
//       console.error("Error sending message:", chrome.runtime.lastError);
//   } else {
//       console.log("Response from Background:", response);
//   }
// });

// Trigger TTS (Text-to-Speech) when focus is lost

window.addEventListener("blur", function () {
  chrome.runtime.sendMessage({ action: "triggerTTS" }, (response) => {
    console.log(response.status);
  });
});
  