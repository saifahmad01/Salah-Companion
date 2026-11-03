Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | ? { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' }

Function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    $netTask.Result
}

[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrEngine, Windows.Foundation.Diagnostics, ContentType = WindowsRuntime] | Out-Null

$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
$slidesDir = "C:\Users\Mdsai\.gemini\antigravity\brain\1939eea4-fba8-420b-aa3f-5a49b8d4b0d8\scratch\slides"
$outJson = "C:\Users\Mdsai\.gemini\antigravity\brain\1939eea4-fba8-420b-aa3f-5a49b8d4b0d8\scratch\ocr_raw.json"

$files = Get-ChildItem -Path $slidesDir -Filter "slide_*.jpg" | Sort-Object Name
$results = @{}

Write-Host "Starting OCR for $($files.Count) slides..."
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$count = 0

foreach ($fileItem in $files) {
    $idx = [int]($fileItem.BaseName.Replace("slide_", ""))
    if ($idx -eq 0 -or $idx -eq 318) {
        # Skip cover and back cover
        continue
    }

    try {
        $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($fileItem.FullName)) ([Windows.Storage.StorageFile])
        $stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
        $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
        $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
        $ocrResult = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])

        $lines = @()
        foreach ($line in $ocrResult.Lines) {
            $lines += $line.Text
        }

        $results[$idx.ToString()] = @{
            slide = $idx
            text = $ocrResult.Text
            lines = $lines
        }

        $stream.Dispose()

        $count++
        if ($count % 50 -eq 0) {
            Write-Host "Processed $count slides ($([math]::Round($sw.Elapsed.TotalSeconds, 1))s)..."
        }
    } catch {
        Write-Host "Error processing $($fileItem.Name): $($_.Exception.Message)"
    }
}

$results | ConvertTo-Json -Depth 5 | Set-Content -Path $outJson -Encoding UTF8
Write-Host "OCR complete for $count slides in $([math]::Round($sw.Elapsed.TotalSeconds, 1))s! Saved to $outJson"
