# Build the app icon: crop the whale-girl (DeepSeek mascot) idle sprite frame,
# trim transparent margins, composite over a DeepSeek-blue rounded tile,
# then emit icon.png (256) + a multi-size icon.ico (256/128/64/48/32/16).
Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'
$idle = 'C:\Users\19739\.dsh\profiles\web\node_modules\whale-girl\lib\assets\characters\whale-girl\idle.png'
$outPng = 'E:\deepseek_harness\desktop\assets\icon.png'
$outIco = 'E:\deepseek_harness\desktop\assets\icon.ico'
$outDir = 'E:\deepseek_harness\desktop\assets'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$src = [System.Drawing.Bitmap]::FromFile($idle)   # 768x256 sprite sheet
$frame = $src.Clone([System.Drawing.Rectangle]::new(0, 0, 256, 256), $src.PixelFormat)
$src.Dispose()

# --- alpha bounding box ---
$rect = [System.Drawing.Rectangle]::new(0, 0, $frame.Width, $frame.Height)
$bd = $frame.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$stride = $bd.Stride
$bytes = New-Object byte[] ($stride * $frame.Height)
[System.Runtime.InteropServices.Marshal]::Copy($bd.Scan0, $bytes, 0, $bytes.Length)
$frame.UnlockBits($bd)
$minX = $frame.Width; $minY = $frame.Height; $maxX = -1; $maxY = -1
for ($y = 0; $y -lt $frame.Height; $y++) {
  for ($x = 0; $x -lt $frame.Width; $x++) {
    $a = $bytes[$y * $stride + $x * 4 + 3]
    if ($a -gt 24) {
      if ($x -lt $minX) { $minX = $x }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}
if ($maxX -lt 0) { $minX = 0; $minY = 0; $maxX = $frame.Width - 1; $maxY = $frame.Height - 1 }
$char = $frame.Clone([System.Drawing.Rectangle]::new($minX, $minY, $maxX - $minX + 1, $maxY - $minY + 1), $frame.PixelFormat)
$frame.Dispose()
Write-Host "character bbox: ${minX},${minY} -> ${maxX},${maxY} (${($maxX-$minX+1)}x${($maxY-$minY+1)})"

function New-IconBase([int]$size) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.PixelOffsetMode = 'HighQuality'
  # rounded-rect clip
  $r = [Math]::Max(4, [int]($size * 0.20))
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = 2 * $r
  $path.AddArc(0, 0, $d, $d, 180, 90)
  $path.AddArc($size - $d, 0, $d, $d, 270, 90)
  $path.AddArc($size - $d, $size - $d, $d, $d, 0, 90)
  $path.AddArc(0, $size - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  $g.SetClip($path)
  # DeepSeek-blue gradient
  $full = [System.Drawing.Rectangle]::new(0, 0, $size, $size)
  $c0 = [System.Drawing.Color]::FromArgb(78, 114, 250)   # #4E72FA
  $c1 = [System.Drawing.Color]::FromArgb(24, 42, 120)    # #182A78
  $br = New-Object System.Drawing.Drawing2D.LinearGradientBrush($full, $c0, $c1, 70.0)
  $g.FillRectangle($br, $full)
  $br.Dispose()
  # soft radial glow behind the character
  $glow = New-Object System.Drawing.Drawing2D.GraphicsPath
  $gr = $size * 0.42
  $glow.AddEllipse($size/2 - $gr, $size/2 - $gr, 2*$gr, 2*$gr)
  $pbg = New-Object System.Drawing.Drawing2D.PathGradientBrush($glow)
  $pbg.CenterColor = [System.Drawing.Color]::FromArgb(90, 255, 255, 255)
  $pbg.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 255, 255, 255))
  $g.FillPath($pbg, $glow)
  $pbg.Dispose(); $glow.Dispose()
  # draw character centered, fit within ~80% of the tile
  $target = $size * 0.80
  $scale = [Math]::Min($target / $char.Width, $target / $char.Height)
  $w = [int]($char.Width * $scale); $h = [int]($char.Height * $scale)
  $x = [int](($size - $w) / 2); $y = [int](($size - $h) / 2)
  $g.DrawImage($char, $x, $y, $w, $h)
  $g.Dispose()
  return $bmp
}

# 256px PNG
$base = New-IconBase 256
$base.Save($outPng, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "wrote $outPng"

# --- assemble multi-size ICO (PNG-compressed entries) ---
$sizes = @(256, 128, 64, 48, 32, 16)
$pngEntries = New-Object System.Collections.Generic.List[byte[]]
foreach ($s in $sizes) {
  $b = New-IconBase $s
  $ms = New-Object System.IO.MemoryStream
  $b.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $pngEntries.Add($ms.ToArray())
  $b.Dispose(); $ms.Dispose()
}
$base.Dispose()

$ico = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($ico)
$bw.Write([UInt16]0)      # reserved
$bw.Write([UInt16]1)      # type: icon
$bw.Write([UInt16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $s = $sizes[$i]; $data = $pngEntries[$i]
  $bw.Write([byte]($(if ($s -ge 256) { 0 } else { $s })))  # width (0 = 256)
  $bw.Write([byte]($(if ($s -ge 256) { 0 } else { $s })))  # height
  $bw.Write([byte]0)      # palette
  $bw.Write([byte]0)      # reserved
  $bw.Write([UInt16]1)    # color planes
  $bw.Write([UInt16]32)   # bpp
  $bw.Write([UInt32]$data.Length)
  $bw.Write([UInt32]$offset)
  $offset += $data.Length
}
foreach ($d in $pngEntries) { $bw.Write($d) }
$bw.Flush()
[System.IO.File]::WriteAllBytes($outIco, $ico.ToArray())
$bw.Dispose(); $ico.Dispose()
Write-Host "wrote $outIco ($((Get-Item $outIco).Length) bytes, $($sizes.Count) sizes)"
