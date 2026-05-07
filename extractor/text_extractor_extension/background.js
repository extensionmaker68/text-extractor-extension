chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "initiate_selection") {
        setTimeout(() => startSelectionProcess(), 250);
        sendResponse({status: 'started'});
    }
    
    if (request.action === "process_image") {
        doOCR(request.image, sender.tab.id);
        sendResponse({status: 'started'});
    }
    return true;
});

chrome.commands.onCommand.addListener((command) => {
    if (command === "extract_text") {
        startSelectionProcess();
    }
});

async function startSelectionProcess() {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    
    const data = await chrome.storage.local.get(['isEnabled']);
    if (data.isEnabled === false) return; 

    try {
        let dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });

        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"]
        });
        await chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: ["content.css"]
        });

        chrome.tabs.sendMessage(tab.id, { action: "show_overlay", image: dataUrl });
    } catch (e) {
        console.error("Capture failed: ", e);
    }
}

let creating; 
async function setupOffscreenDocument(path) {
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL(path)]
    });

    if (existingContexts.length > 0) return;

    if (creating) {
        await creating;
    } else {
        creating = chrome.offscreen.createDocument({
            url: path,
            reasons: ['WORKERS'],
            justification: 'Run Tesseract OCR worker'
        });
        await creating;
        creating = null;
    }
}

async function doOCR(dataUrl, tabId) {
    await setupOffscreenDocument('offscreen.html');
    
    chrome.runtime.sendMessage({ action: "recognize_text", image: dataUrl }, async (response) => {
        if (chrome.runtime.lastError) {
             console.error("Messaging Error:", chrome.runtime.lastError);
             chrome.tabs.sendMessage(tabId, { action: "ocr_error", error: "Failed to communicate with OCR process." });
             return;
        }
        if (response && response.text) {
             const data = await chrome.storage.local.get(['extractedText']);
             let newText = (data.extractedText ? data.extractedText + "\n\n" : "") + response.text.trim();
             await chrome.storage.local.set({ extractedText: newText });

             chrome.tabs.sendMessage(tabId, { action: "ocr_complete", text: response.text });
        } else {
             chrome.tabs.sendMessage(tabId, { action: "ocr_error", error: response?.error || "Error extracting text." });
        }
    });
}
