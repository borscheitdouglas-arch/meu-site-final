$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pages = Get-ChildItem -Path (Join-Path $root '..\pages') -Recurse -Filter *.html
$standard = @'
<header class="site-header">
    <button id="menu-btn" class="menu-btn">☰</button>
    <div class="logo"><a href="/index.html"><img src="/assets/img/icone.png" alt="CNP" id="site-logo"></a></div>
    <div class="header-actions">
      <a class="icon-btn" href="/pages/loja.html" title="Loja">
        <img src="/assets/img/icone1.png" alt="Loja" class="icon-img">
        <span class="icon-label">LOJA</span>
      </a>
      <a class="icon-btn" href="/pages/contato.html" title="Contato">
        <img src="/assets/img/icone2.png" alt="Contato" class="icon-img">
        <span class="icon-label">CONTATO</span>
      </a>
      <input id="search" type="search" placeholder="Buscar..." />
    </div>
  </header>
'@

foreach($f in $pages){
  try{
    $text = Get-Content -Raw -Encoding UTF8 $f.FullName
  }catch{
    Write-Host "Failed read: $($f.FullName)"
    continue
  }
  if($text -like '*class="site-header"*'){
    # localizar inicio do header
    $start = $text.IndexOf('<header')
    if($start -ge 0){
      $classPos = $text.IndexOf('class="site-header"', $start)
      if($classPos -ge 0){
        $end = $text.IndexOf('</header>', $classPos)
        if($end -ge 0){
          $end = $end + 9
          $old = $text.Substring($start, $end - $start)
          $newText = $text.Substring(0, $start) + $standard + $text.Substring($end)
          if($newText -ne $text){
            Copy-Item $f.FullName ($f.FullName + '.bak') -Force
            Set-Content -Path $f.FullName -Value $newText -Encoding UTF8
            Write-Host "Updated: $($f.FullName)"
          } else {
            Write-Host "No change for: $($f.FullName)"
          }
        } else {
          Write-Host "Could not find </header> for: $($f.FullName)"
        }
      } else {
        Write-Host "No class match in: $($f.FullName)"
      }
    } else {
      Write-Host "No <header> start in: $($f.FullName)"
    }
  } else {
    Write-Host "Skipped (no header): $($f.FullName)"
  }
}
Write-Host 'Done'
