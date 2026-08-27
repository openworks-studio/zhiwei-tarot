Add-Type -AssemblyName System.Drawing

$assetDir = Join-Path $PSScriptRoot "..\assets"
New-Item -ItemType Directory -Force -Path $assetDir | Out-Null

function New-StarPath {
    param(
        [float]$CenterX,
        [float]$CenterY,
        [float]$OuterRadius,
        [float]$InnerRadius,
        [int]$Points = 8
    )

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $vertices = New-Object System.Collections.Generic.List[System.Drawing.PointF]
    for ($i = 0; $i -lt ($Points * 2); $i++) {
        $angle = (-[Math]::PI / 2) + ($i * [Math]::PI / $Points)
        $radius = if ($i % 2 -eq 0) { $OuterRadius } else { $InnerRadius }
        $vertices.Add([System.Drawing.PointF]::new(
            $CenterX + [Math]::Cos($angle) * $radius,
            $CenterY + [Math]::Sin($angle) * $radius
        ))
    }
    $path.AddPolygon($vertices.ToArray())
    return $path
}

function New-CardBack {
    $width = 600
    $height = 960
    $bitmap = New-Object System.Drawing.Bitmap($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.Color]::FromArgb(49, 30, 31))

    $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(218, 186, 118), 8)
    $finePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(145, 116, 71), 2)
    $inkPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(242, 226, 186), 4)
    $glowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(24, 242, 226, 186))
    $goldBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(218, 186, 118))

    $graphics.DrawRectangle($borderPen, 24, 24, $width - 48, $height - 48)
    $graphics.DrawRectangle($finePen, 42, 42, $width - 84, $height - 84)

    for ($y = 80; $y -lt $height - 70; $y += 68) {
        for ($x = 76; $x -lt $width - 60; $x += 68) {
            $offset = if (([int]($y / 68)) % 2 -eq 0) { 0 } else { 34 }
            $graphics.DrawEllipse($finePen, $x + $offset - 18, $y - 18, 36, 36)
            $graphics.DrawLine($finePen, $x + $offset - 13, $y - 13, $x + $offset + 13, $y + 13)
            $graphics.DrawLine($finePen, $x + $offset + 13, $y - 13, $x + $offset - 13, $y + 13)
        }
    }

    $graphics.FillEllipse($glowBrush, 110, 290, 380, 380)
    $graphics.DrawEllipse($inkPen, 148, 328, 304, 304)
    $graphics.DrawEllipse($finePen, 176, 356, 248, 248)
    $star = New-StarPath -CenterX 300 -CenterY 480 -OuterRadius 128 -InnerRadius 43 -Points 8
    $graphics.FillPath($goldBrush, $star)
    $graphics.DrawLine($inkPen, 300, 236, 300, 724)
    $graphics.DrawLine($inkPen, 56, 480, 544, 480)

    foreach ($point in @(
        @(102, 130, 5), @(498, 130, 5), @(102, 830, 5), @(498, 830, 5),
        @(300, 105, 8), @(300, 855, 8), @(76, 480, 8), @(524, 480, 8)
    )) {
        $graphics.FillEllipse($goldBrush, $point[0] - $point[2], $point[1] - $point[2], $point[2] * 2, $point[2] * 2)
    }

    $path = Join-Path $assetDir "card-back.png"
    $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)

    $star.Dispose()
    $goldBrush.Dispose()
    $glowBrush.Dispose()
    $inkPen.Dispose()
    $finePen.Dispose()
    $borderPen.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
}

function New-TableTexture {
    $width = 1600
    $height = 1200
    $bitmap = New-Object System.Drawing.Bitmap($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.Color]::FromArgb(31, 38, 34))

    $random = [System.Random]::new(7281)
    for ($i = 0; $i -lt 1900; $i++) {
        $x = $random.Next(0, $width)
        $y = $random.Next(0, $height)
        $alpha = $random.Next(5, 20)
        $tone = if ($i % 3 -eq 0) {
            [System.Drawing.Color]::FromArgb($alpha, 209, 186, 129)
        } else {
            [System.Drawing.Color]::FromArgb($alpha, 237, 232, 217)
        }
        $brush = New-Object System.Drawing.SolidBrush($tone)
        $size = $random.Next(1, 5)
        $graphics.FillEllipse($brush, $x, $y, $size, $size)
        $brush.Dispose()
    }

    $arcPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(16, 227, 202, 143), 2)
    for ($i = 0; $i -lt 12; $i++) {
        $diameter = 180 + ($i * 120)
        $graphics.DrawEllipse($arcPen, ($width - $diameter) / 2, ($height - $diameter) / 2, $diameter, $diameter)
    }

    $path = Join-Path $assetDir "reading-table.png"
    $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)

    $arcPen.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
}

New-CardBack
New-TableTexture

Write-Output "Generated card-back.png and reading-table.png in $assetDir"
