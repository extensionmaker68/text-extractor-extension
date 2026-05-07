document.addEventListener('DOMContentLoaded', async () => {
    const extractBtn = document.getElementById('extract-btn');
    const toggle = document.getElementById('toggle-extension');
    const textBox = document.getElementById('extracted-text-box');
    const clearBtn = document.getElementById('clear-btn');

    const data = await chrome.storage.local.get(['isEnabled', 'extractedText']);
    const isEnabled = data.isEnabled !== false; 
    toggle.checked = isEnabled;
    
    if (data.extractedText) {
        textBox.value = data.extractedText;
    }

    textBox.addEventListener('input', async () => {
        await chrome.storage.local.set({ extractedText: textBox.value });
    });

    clearBtn.addEventListener('click', async () => {
        textBox.value = "";
        await chrome.storage.local.set({ extractedText: "" });
    });

    toggle.addEventListener('change', async () => {
        await chrome.storage.local.set({ isEnabled: toggle.checked });
    });

    extractBtn.addEventListener('click', async () => {
        if (!toggle.checked) return;
        
        chrome.runtime.sendMessage({ action: "initiate_selection" });
        window.close(); 
    });
});
