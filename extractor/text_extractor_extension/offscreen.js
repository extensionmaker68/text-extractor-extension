let workerInstance = null;

async function getWorker() {
    if (workerInstance) return workerInstance;
    
    workerInstance = await Tesseract.createWorker("eng", 1, {
        workerPath: chrome.runtime.getURL('vendor/worker.min.js'),
        corePath: chrome.runtime.getURL('vendor/tesseract-core.wasm.js'),
        langPath: chrome.runtime.getURL('vendor'), 
        workerBlobURL: false,
        gzip: true
    });
    
    return workerInstance;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "recognize_text") {
        (async () => {
            try {
                const worker = await getWorker();
                const ret = await worker.recognize(request.image);
                sendResponse({ text: ret.data.text });
            } catch (err) {
                console.error("Worker catch:", err);
                let errStr = err ? (err.message || String(err)) : "Unknown worker error";
                sendResponse({ text: null, error: errStr });
            }
        })();
        return true; 
    }
});
