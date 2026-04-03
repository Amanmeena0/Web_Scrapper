chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.action === "scrape") {

        try {
            let elements = document.querySelectorAll(request.selector);

            let data = Array.from(elements)
                .map(el => el.innerText.trim())
                .filter(text => text.length > 0);

            sendResponse({ success: true, data });

        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    return true; // keeps async response valid
});