param([string]$SourcePath = (Join-Path $PSScriptRoot 'icons/source-38.png'))
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$iconDir = Join-Path $PSScriptRoot 'icons'
New-Item -ItemType Directory -Path $iconDir -Force | Out-Null
$sourceImage = [System.Drawing.Image]::FromFile($SourcePath)
if ($sourceImage.Width -ne $sourceImage.Height) { $sourceImage.Dispose(); throw '請使用正方形圖示來源圖片。' }
foreach ($spec in @(@('apple-touch-icon-38.png',180), @('icon-38-192.png',192), @('icon-38-512.png',512), @('icon-38-maskable-512.png',512))) {
  $size = [int]$spec[1]
  $bitmap = New-Object System.Drawing.Bitmap($size,$size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = 'AntiAlias'
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#00032b'))
  $factor = if ($spec[0] -like '*maskable*') { 0.84 } else { 1.0 }
  $edge = [int][Math]::Round($size * $factor)
  $offset = [int][Math]::Round(($size - $edge) / 2)
  $target = [System.Drawing.Rectangle]::new($offset,$offset,$edge,$edge)
  $attributes = [System.Drawing.Imaging.ImageAttributes]::new()
  $attributes.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
  $graphics.DrawImage($sourceImage,$target,0,0,$sourceImage.Width,$sourceImage.Height,[System.Drawing.GraphicsUnit]::Pixel,$attributes)
  $bitmap.Save((Join-Path $iconDir $spec[0]),[System.Drawing.Imaging.ImageFormat]::Png)
  $attributes.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}
$sourceImage.Dispose()
