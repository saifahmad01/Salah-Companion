Add-Type -AssemblyName System.Drawing

function Generate-PwaIcon {
    param(
        [int]$size,
        [string]$path,
        [bool]$maskable = $false
    )
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
    
    # Emerald Green Background #064E3B
    $bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#064E3B'))
    $g.FillRectangle($bgBrush, 0, 0, $size, $size)
    
    # Gold Accent Colors
    $goldPen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#E2B755')), ([float]($size * 0.03))
    $goldBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#E2B755'))
    
    # Circular emblem (with padding for maskable)
    $margin = if ($maskable) { [float]($size * 0.18) } else { [float]($size * 0.08) }
    $circleSize = [float]($size - (2 * $margin))
    $g.DrawEllipse($goldPen, $margin, $margin, $circleSize, $circleSize)
    
    # Inner decorative ring
    $innerMargin = [float]($margin + ($size * 0.04))
    $innerSize = [float]($size - (2 * $innerMargin))
    $thinGoldPen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#997733')), ([float]($size * 0.01))
    $g.DrawEllipse($thinGoldPen, $innerMargin, $innerMargin, $innerSize, $innerSize)
    
    # Crescent Moon
    $cx = [float]($size * 0.48)
    $cy = [float]($size * 0.46)
    $radius = [float]($size * 0.22)
    
    $path1 = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path1.AddEllipse([float]($cx - $radius), [float]($cy - $radius), [float]($radius * 2), [float]($radius * 2))
    
    $path2 = New-Object System.Drawing.Drawing2D.GraphicsPath
    $innerOffset = [float]($radius * 0.35)
    $innerR = [float]($radius * 0.85)
    $path2.AddEllipse([float]($cx - $innerR + $innerOffset), [float]($cy - $innerR - ($radius * 0.1)), [float]($innerR * 2), [float]($innerR * 2))
    
    $region = New-Object System.Drawing.Region $path1
    $region.Exclude($path2)
    $g.FillRegion($goldBrush, $region)
    
    # Star (5-point)
    $starX = [float]($cx + ($radius * 0.6))
    $starY = [float]($cy - ($radius * 0.35))
    $starR = [float]($size * 0.05)
    $points = New-Object System.Drawing.PointF[] 10
    for ($i = 0; $i -lt 10; $i++) {
        $a = $i * [Math]::PI / 5 - ([Math]::PI / 2)
        $r = if ($i % 2 -eq 0) { $starR } else { $starR * 0.45 }
        $px = [float]($starX + $r * [Math]::Cos($a))
        $py = [float]($starY + $r * [Math]::Sin($a))
        $points[$i] = New-Object System.Drawing.PointF $px, $py
    }
    $g.FillPolygon($goldBrush, $points)
    
    # Small Dome silhouette at base
    $domeWidth = [float]($size * 0.34)
    $domeHeight = [float]($size * 0.18)
    $domeX = [float](($size - $domeWidth) / 2)
    $domeY = [float]($size - $margin - ($size * 0.12))
    $g.FillPie($goldBrush, $domeX, [float]($domeY - $domeHeight), $domeWidth, [float]($domeHeight * 2), [float]180, [float]180)
    
    $g.Dispose()
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Generated: $path"
}

Generate-PwaIcon -size 192 -path "public/pwa-192x192.png" -maskable $false
Generate-PwaIcon -size 512 -path "public/pwa-512x512.png" -maskable $false
Generate-PwaIcon -size 512 -path "public/maskable-icon-512x512.png" -maskable $true
