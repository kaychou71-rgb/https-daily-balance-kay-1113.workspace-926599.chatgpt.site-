Add-Type -AssemblyName System.Drawing
$iconDir = Join-Path $PSScriptRoot 'icons'
New-Item -ItemType Directory -Path $iconDir -Force | Out-Null
foreach ($spec in @(@('apple-touch-icon.png',180), @('icon-192.png',192), @('icon-512.png',512), @('icon-maskable-512.png',512))) {
  $size = [int]$spec[1]
  $bitmap = New-Object System.Drawing.Bitmap($size,$size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = 'AntiAlias'
  $graphics.ScaleTransform($size/512.0,$size/512.0)
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#dff3ff'))
  $blue = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#0369a1'))
  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $light = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#7dd3fc'))
  $graphics.FillEllipse($blue,116,116,280,280)
  $graphics.FillEllipse($white,139,139,234,234)
  $graphics.FillPie($light,160,160,192,192,270,180)
  $graphics.FillPie($blue,160,160,192,192,90,180)
  $bitmap.Save((Join-Path $iconDir $spec[0]),[System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose(); $bitmap.Dispose(); $blue.Dispose(); $white.Dispose(); $light.Dispose()
}
