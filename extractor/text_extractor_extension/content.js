if (typeof window.textExtractorLoaded === 'undefined') {
    window.textExtractorLoaded = true;

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "show_overlay") {
            createOverlay(request.image);
        } else if (request.action === "ocr_complete") {
            removeLoading();
            copyTextAndNotify(request.text);
        } else if (request.action === "ocr_error") {
            removeLoading();
            showNotification("Failed to extract text: " + (request.error || ""), true);
        }
    });

    let overlayDiv = null;
    let loadingDiv = null;

    function createOverlay(dataUrl) {
        if (overlayDiv) return;

        overlayDiv = document.createElement('div');
        overlayDiv.id = "text-extractor-overlay";

        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            overlayDiv.appendChild(canvas);
            document.body.appendChild(overlayDiv);

            const ctx = canvas.getContext('2d');
            
            let isDrawing = false;
            let startX, startY;
            let currX, currY;

            function draw() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                ctx.fillStyle = "rgba(0,0,0,0.4)";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                if (startX !== undefined && currX !== undefined && isDrawing) {
                     const x = Math.min(startX, currX);
                     const y = Math.min(startY, currY);
                     const w = Math.abs(currX - startX);
                     const h = Math.abs(currY - startY);
                     
                     ctx.clearRect(0,0, canvas.width, canvas.height);
                     ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                     
                     ctx.fillStyle = "rgba(0,0,0,0.4)";
                     ctx.beginPath();
                     ctx.rect(0, 0, canvas.width, canvas.height);
                     ctx.rect(x, y, w, h);
                     ctx.fill("evenodd");
                     
                     ctx.strokeStyle = "#FF0239";
                     ctx.lineWidth = 1;
                     ctx.strokeRect(x, y, w, h);
                }
            }
            
            draw();
            
            overlayDiv.addEventListener('mousedown', (e) => {
                isDrawing = true;
                startX = e.clientX;
                startY = e.clientY;
                currX = startX;
                currY = startY;
            });
            
            overlayDiv.addEventListener('mousemove', (e) => {
                if (!isDrawing) return;
                currX = e.clientX;
                currY = e.clientY;
                draw();
            });
            
            overlayDiv.addEventListener('mouseup', (e) => {
                isDrawing = false;
                const x = Math.min(startX, currX);
                const y = Math.min(startY, currY);
                const w = Math.abs(currX - startX);
                const h = Math.abs(currY - startY);
                
                if (w > 10 && h > 10) {
                    const cropCanvas = document.createElement('canvas');
                    const scaleX = img.width / window.innerWidth;
                    const scaleY = img.height / window.innerHeight;
                    
                    cropCanvas.width = w * scaleX;
                    cropCanvas.height = h * scaleY;
                    const cropCtx = cropCanvas.getContext('2d');
                    
                    cropCtx.drawImage(img, x * scaleX, y * scaleY, w * scaleX, h * scaleY, 0, 0, cropCanvas.width, cropCanvas.height);
                    
                    const croppedDataUrl = cropCanvas.toDataURL("image/png");
                    
                    closeOverlay();
                    showLoading();
                    
                    chrome.runtime.sendMessage({ action: "process_image", image: croppedDataUrl });
                } else {
                    closeOverlay();
                }
            });
            
            const cancelOverlay = (e) => {
                if (e.key === "Escape") {
                    closeOverlay();
                    document.removeEventListener('keydown', cancelOverlay);
                }
            };
            document.addEventListener('keydown', cancelOverlay);
        };
    }

    function closeOverlay() {
        if (overlayDiv) {
            overlayDiv.remove();
            overlayDiv = null;
        }
    }

    function showLoading() {
        if (loadingDiv) return;
        loadingDiv = document.createElement('div');
        loadingDiv.id = "text-extractor-loading";
        loadingDiv.innerHTML = `
            <div class="te-loader"></div>
            <div class="te-text">Extracting Text...</div>
        `;
        document.body.appendChild(loadingDiv);
    }

    function removeLoading() {
        if (loadingDiv) {
            loadingDiv.remove();
            loadingDiv = null;
        }
    }

    async function copyTextAndNotify(text) {
        if (!text || text.trim() === "") {
            showNotification("No text found", true);
            return;
        }
        
        try {
            await navigator.clipboard.writeText(text);
            showNotification("Text Copied!");
        } catch (e) {
            console.error("Clipboard write failed", e);
            showNotification("Failed to copy", true);
        }
    }

    function showNotification(msg, isError = false) {
        const notif = document.createElement('div');
        notif.className = "text-extractor-notify";
        notif.innerText = msg;
        if (isError) notif.style.borderLeftColor = "#f44336";
        document.body.appendChild(notif);
        
        setTimeout(() => {
            notif.classList.add("show");
        }, 10);
        
        setTimeout(() => {
            notif.classList.remove("show");
            setTimeout(() => notif.remove(), 300);
        }, 2500);
    }
}
