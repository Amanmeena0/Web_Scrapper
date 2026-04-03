let scrapedData = [];
let currentURL = "";

const scrapeBtn = document.getElementById("scrapeBtn");
const downloadBtn = document.getElementById("downloadBtn");

function sendScrapeMessage(tabId, selector) {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, { action: "scrape", selector }, (response) => {
            if (!chrome.runtime.lastError) {
                resolve(response);
                return;
            }

            const message = chrome.runtime.lastError.message || "Unknown error";

            if (!message.includes("Receiving end does not exist")) {
                reject(new Error(message));
                return;
            }

            // Fallback: inject content script into the active tab, then retry.
            chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] }, () => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message || "Failed to inject content script"));
                    return;
                }

                chrome.tabs.sendMessage(tabId, { action: "scrape", selector }, (retryResponse) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message || "Failed to send scrape message"));
                        return;
                    }
                    resolve(retryResponse);
                });
            });
        });
    });
}

// SCRAPE BUTTON
scrapeBtn.addEventListener("click", async () => {

    let selector = document.getElementById("selector").value.trim();
    if (!selector) {
        selector = "body";
    }

    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentURL = tab.url;

    // UI state update
    scrapeBtn.innerText = "Scraping...";
    scrapeBtn.disabled = true;

    try {
        const response = await sendScrapeMessage(tab.id, selector);

        if (!response || !response.success) {
            alert("Scraping failed");
            resetButton();
            return;
        }

        scrapedData = response.data;
        renderResults(scrapedData);
    } catch (error) {
        alert("Error: " + error.message);
    } finally {
        resetButton();
    }
});


// RESET BUTTON STATE
function resetButton() {
    scrapeBtn.innerText = "Scrape Data";
    scrapeBtn.disabled = false;
}


// RENDER RESULTS
function renderResults(data) {

    let resultList = document.getElementById("results");
    resultList.innerHTML = "";

    if (data.length === 0) {
        resultList.innerHTML = "<li>No data found</li>";
        return;
    }

    data.forEach((item, index) => {
        let li = document.createElement("li");
        li.textContent = `${index + 1}. ${item}`;
        resultList.appendChild(li);
    });
}


// DOWNLOAD TXT
downloadBtn.addEventListener("click", () => {

    if (scrapedData.length === 0) {
        alert("No data to download. Please scrape first.");
        return;
    }

    let formattedText = formatText(scrapedData);

    let blob = new Blob([formattedText], { type: "text/plain" });
    let url = URL.createObjectURL(blob);

    let a = document.createElement("a");
    a.href = url;
    a.download = "scraped_data.txt";
    a.click();

    URL.revokeObjectURL(url);
});


// FORMAT TEXT (Structured + Metadata)
function formatText(data) {

    let header = `SMART SCRAPER OUTPUT
URL: ${currentURL}
Timestamp: ${new Date().toLocaleString()}

----------------------------------------

`;

    let body = data.map((item, index) => `${index + 1}. ${item}`).join("\n");

    return header + body;
}