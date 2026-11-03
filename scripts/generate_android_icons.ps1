Add-Type -AssemblyName System.Drawing

$resDirs = @{
    "mdpi" = 48
    "hdpi" = 72
    "xhdpi" = 96
    "xxhdpi" = 144
    "xxxhdpi" = 192
}

function Generate-AndroidIcon {
    param(
        [int]$size,
        [string]$path,
        [bool]$isRound = $false,
        [bool]$foregroundOnly = $false
    )
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    
    if (-not $foregroundOnly) {
        $bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#064E3B'))
        if ($isRound) {
            $g.FillEllipse($bgBrush, 0, 0, $size, $size)
        } else {
            $g.FillRectangle($bgBrush, 0, 0, $size, $size)
        }
    }
    
    # Gold Emblem
    $goldBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#E2B755'))
    $margin = [float]($size * 0.12)
    $circleSize = [float]($size - (2 * $margin))
    $goldPen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#E2B755')), ([float]($size * 0.035))
    $g.DrawEllipse($goldPen, $margin, $margin, $circleSize, $circleSize)
    
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
    
    # Star
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
    
    # Dome silhouette
    $domeWidth = [float]($size * 0.34)
    $domeHeight = [float]($size * 0.18)
    $domeX = [float](($size - $domeWidth) / 2)
    $domeY = [float]($size - $margin - ($size * 0.12))
    $g.FillPie($goldBrush, $domeX, [float]($domeY - $domeHeight), $domeWidth, [float]($domeHeight * 2), [float]180, [float]180)
    
    $g.Dispose()
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

foreach ($density in $resDirs.Keys) {
    $size = $resDirs[$density]
    $dir = "android/app/src/main/res/mipmap-$density"
    if (Test-Path $dir) {
        Generate-AndroidIcon -size $size -path "$dir/ic_launcher.png" -isRound $false -foregroundOnly $false
        Generate-AndroidIcon -size $size -path "$dir/ic_launcher_round.png" -isRound $true -foregroundOnly $false
        Generate-AndroidIcon -size ($size * 2) -path "$dir/ic_launcher_foreground.png" -isRound $false -foregroundOnly $true
        Write-Host "Updated mipmap-$density icons ($size x $size)"
    }
}
