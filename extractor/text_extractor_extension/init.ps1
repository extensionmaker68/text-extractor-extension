$ErrorActionPreference = 'Stop'
Write-Host "Creating Directories..."
New-Item -ItemType Directory -Force -Path "vendor" | Out-Null
Write-Host "Downloading Tesseract files..."
Invoke-WebRequest -UseBasicParsing -Uri "https://unpkg.com/tesseract.js@5.0.5/dist/tesseract.min.js" -OutFile "vendor/tesseract.min.js"
Invoke-WebRequest -UseBasicParsing -Uri "https://unpkg.com/tesseract.js@5.0.5/dist/worker.min.js" -OutFile "vendor/worker.min.js"
Invoke-WebRequest -UseBasicParsing -Uri "https://unpkg.com/tesseract.js-core@3.0.2/tesseract-core.wasm.js" -OutFile "vendor/tesseract-core.wasm.js"
Write-Host "Downloading traineddata (~22MB)..."
Invoke-WebRequest -UseBasicParsing -Uri "https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz" -OutFile "vendor/eng.traineddata.gz"
Write-Host "Initial dependencies setup complete. You can now load the extension into Chrome!"
