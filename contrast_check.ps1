function Get-Luminance {
    param([string]$hex)
    $hex = $hex.TrimStart('#')
    $r = [Convert]::ToInt32($hex.Substring(0,2), 16)
    $g = [Convert]::ToInt32($hex.Substring(2,2), 16)
    $b = [Convert]::ToInt32($hex.Substring(4,2), 16)
    function ToLinear([double]$c) {
        $cl = $c / 255.0
        if ($cl -le 0.04045) { return $cl / 12.92 }
        else { return [Math]::Pow(($cl + 0.055) / 1.055, 2.4) }
    }
    $R = ToLinear $r
    $G = ToLinear $g
    $B = ToLinear $b
    return 0.2126 * $R + 0.7152 * $G + 0.0722 * $B
}

function Get-Contrast {
    param([string]$hex1, [string]$hex2)
    $L1 = Get-Luminance $hex1
    $L2 = Get-Luminance $hex2
    if ($L1 -gt $L2) { $lighter = $L1; $darker = $L2 }
    else { $lighter = $L2; $darker = $L1 }
    return ($lighter + 0.05) / ($darker + 0.05)
}

function Check {
    param([string]$label, [string]$fg, [string]$bg, [double]$required)
    $c = Get-Contrast $fg $bg
    $status = if ($c -ge $required) { "PASS" } else { "FAIL" }
    Write-Host ("  {0,-50} {1,6:F2}:1  [{2}]" -f $label, $c, $status)
}

Write-Host ""
Write-Host "=== LIGHT THEME ===" -ForegroundColor Cyan
$lbg      = "#f2f4f8"
$lsurf    = "#ffffff"
$lsurf2   = "#e8ecf2"
$ltext    = "#1a1d23"
$lmuted   = "#5a6070"
$laccent  = "#4f6ef7"
$lacFg    = "#ffffff"
$lsuccess = "#2e7d32"
$lerror   = "#c62828"
$lwarning = "#e65100"

Write-Host "`n-- Normal text on backgrounds (need 4.5:1) --"
Check "text on bg"        $ltext $lbg    4.5
Check "text on surface"   $ltext $lsurf  4.5
Check "text on surface-2" $ltext $lsurf2 4.5

Write-Host "`n-- Muted text on surfaces (need 4.5:1) --"
Check "muted on surface"   $lmuted $lsurf  4.5
Check "muted on surface-2" $lmuted $lsurf2 4.5

Write-Host "`n-- Accent as link text (need 4.5:1) --"
Check "accent on surface"   $laccent $lsurf  4.5
Check "accent on surface-2" $laccent $lsurf2 4.5

Write-Host "`n-- Accent-fg on accent button (need 4.5:1) --"
Check "accent-fg on accent" $lacFg $laccent 4.5

Write-Host "`n-- Semantic colors (need 4.5:1 except warning 3:1) --"
Check "error on surface-2"   $lerror   $lsurf2 4.5
Check "success on surface"   $lsuccess $lsurf  4.5
Check "warning on surface-2" $lwarning $lsurf2 3.0

Write-Host ""
Write-Host "=== DARK THEME ===" -ForegroundColor Cyan
$dbg      = "#0f1117"
$dsurf    = "#1c1f2e"
$dsurf2   = "#252839"
$dtext    = "#e8eaf2"
$dmuted   = "#8b92a8"
$daccent  = "#6c8aff"
$dacFg    = "#0f1117"
$dsuccess = "#66bb6a"
$derror   = "#ef5350"
$dwarning = "#ffa726"

Write-Host "`n-- Normal text on backgrounds (need 4.5:1) --"
Check "text on bg"        $dtext $dbg    4.5
Check "text on surface"   $dtext $dsurf  4.5
Check "text on surface-2" $dtext $dsurf2 4.5

Write-Host "`n-- Muted text on surfaces (need 4.5:1) --"
Check "muted on surface"   $dmuted $dsurf  4.5
Check "muted on surface-2" $dmuted $dsurf2 4.5

Write-Host "`n-- Accent as link text (need 4.5:1) --"
Check "accent on surface"   $daccent $dsurf  4.5
Check "accent on surface-2" $daccent $dsurf2 4.5

Write-Host "`n-- Accent-fg on accent button (need 4.5:1) --"
Check "accent-fg on accent" $dacFg $daccent 4.5

Write-Host "`n-- Semantic colors (need 4.5:1 except warning 3:1) --"
Check "error on surface-2"   $derror   $dsurf2 4.5
Check "success on surface"   $dsuccess $dsurf  4.5
Check "warning on surface-2" $dwarning $dsurf2 3.0

Write-Host ""
