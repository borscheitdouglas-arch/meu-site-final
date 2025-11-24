<#
Apply header from root index.html into all HTML files under pages/.
Usage:
  -Preview : show which files would be changed and a short diff (no writes)
  -Apply   : perform backups and write modified files

The script will:
 - extract the header+nav+nav-overlay block from index.html
 - for each target file: backup to filename.bak.TIMESTAMP
 - if file contains <header class="site-header"> it replaces from <header to </div> (nav-overlay)
 - otherwise it inserts the block immediately after the opening <body ...> tag

This script is conservative and requires -Apply to persist changes.
#>
param(
    [switch]$Preview,
    [switch]$Apply
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
$indexPath = Join-Path $root '..\index.html' | Resolve-Path -LiteralPath
$indexContent = Get-Content -LiteralPath $indexPath -Raw -ErrorAction Stop

# Find header start
$headerStart = $indexContent.IndexOf('<header')
if ($headerStart -lt 0) { Write-Error "Could not find <header> in index.html"; exit 1 }

# Find nav end
$navEnd = $indexContent.IndexOf('</nav>', $headerStart)
if ($navEnd -lt 0) { Write-Error "Could not find closing </nav> in index.html"; exit 1 }
$navEnd += 6 # include </nav>

# Find nav-overlay div after nav
$overlayStart = $indexContent.IndexOf('<div id="nav-overlay"', $navEnd)
if ($overlayStart -lt 0) { Write-Error "Could not find nav-overlay div in index.html"; exit 1 }
$overlayEnd = $indexContent.IndexOf('</div>', $overlayStart)
if ($overlayEnd -lt 0) { Write-Error "Could not find closing </div> for nav-overlay"; exit 1 }
$overlayEnd += 6

$block = $indexContent.Substring($headerStart, $overlayEnd - $headerStart)

Write-Host "Header block extracted (length: $($block.Length) chars)." -ForegroundColor Green

$targets = Get-ChildItem -Path (Join-Path $root '..\pages') -Filter *.html -Recurse

if ($targets.Count -eq 0) { Write-Host "No target files found under pages/."; exit 0 }

foreach ($f in $targets) {
    $path = $f.FullName
    Write-Host "\nProcessing: $path"
    $content = Get-Content -LiteralPath $path -Raw

    $modified = $null

    if ($content -match '<header\s+class="site-header"') {
        # find start of header
        $s = $content.IndexOf('<header')
        $navPos = $content.IndexOf('</nav>', $s)
        if ($navPos -ge 0) { $navPos += 6 }
        else { Write-Warning "Found <header> but not </nav> in $path — skipping replacement."; continue }

        $ovStart = $content.IndexOf('<div id="nav-overlay"', $navPos)
        if ($ovStart -ge 0) {
            $ovEnd = $content.IndexOf('</div>', $ovStart)
            if ($ovEnd -ge 0) { $ovEnd += 6 }
            else { Write-Warning "Found nav-overlay start but not close in $path — skipping."; continue }

            $before = $content.Substring(0, $s)
            $after = $content.Substring($ovEnd)
            $new = $before + $block + $after
            $modified = $new
        } else {
            Write-Warning "No nav-overlay in $path — inserting header before the first <main> instead."
            $mainPos = $content.IndexOf('<main')
            if ($mainPos -gt 0) {
                $before = $content.Substring(0, $mainPos)
                $after = $content.Substring($mainPos)
                $new = $before + $block + "\n" + $after
                $modified = $new
            } else {
                Write-Warning "Can't locate insertion point in $path — skipping."; continue
            }
        }
    } else {
        # insert after opening body tag
        if ($content -match '<body[^>]*>') {
            $m = [regex]::Match($content, '<body[^>]*>')
            $insertPos = $m.Index + $m.Length
            $before = $content.Substring(0, $insertPos)
            $after = $content.Substring($insertPos)
            $new = $before + "\n" + $block + "\n" + $after
            $modified = $new
        } else {
            Write-Warning "No <body> tag found in $path — skipping."; continue
        }
    }

    if ($null -ne $modified) {
        if ($Preview) {
            Write-Host "[Preview] Would update: $path" -ForegroundColor Cyan
            # Show small diff: first differing lines
            $oldLines = $content -split "\r?\n"
            $newLines = $modified -split "\r?\n"
            $max = [math]::Min($oldLines.Length, $newLines.Length)
            $i = 0
            while ($i -lt $max -and $oldLines[$i] -eq $newLines[$i]) { $i++ }
            $start = [math]::Max(0, $i - 3)
            $end = [math]::Min($i + 6, $max - 1)
            Write-Host "--- Context around first difference ---"
            for ($j = $start; $j -le $end; $j++) {
                $o = if ($j -lt $oldLines.Length) { $oldLines[$j] } else { "" }
                $n = if ($j -lt $newLines.Length) { $newLines[$j] } else { "" }
                if ($o -ne $n) { Write-Host ("- " + $o) -ForegroundColor DarkRed; Write-Host ("+ " + $n) -ForegroundColor DarkGreen }
                else { Write-Host ("  " + $o) }
            }
        }

        if ($Apply) {
            $bak = "$path.bak.$((Get-Date).ToString('yyyyMMddHHmmss'))"
            Copy-Item -LiteralPath $path -Destination $bak -ErrorAction Stop
            Write-Host "Backup created: $bak" -ForegroundColor Yellow
            Set-Content -LiteralPath $path -Value $modified -Encoding UTF8 -Force
            Write-Host "Updated: $path" -ForegroundColor Green
        }
    }
}

Write-Host "\nDone. Use -Preview to inspect and -Apply to persist changes." -ForegroundColor Green
