# Offline only: no X window, no receipts outside a temp folder, no publish.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
. (Join-Path $PSScriptRoot 'PostingReceipt.ps1')
. (Join-Path $PSScriptRoot 'PostingVariant.ps1')
. (Join-Path $PSScriptRoot 'XVideoPosting.ps1')
function Assert-True([bool]$Condition, [string]$Name) { if (-not $Condition) { throw "FAILED: $Name" }; Write-Output "PASS $Name" }
function Assert-Throws([scriptblock]$Action, [string]$Name) { $thrown = $false; try { & $Action } catch { $thrown = $true }; Assert-True $thrown $Name }
$config = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'posting_config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$tmp = Join-Path ([IO.Path]::GetTempPath()) ('x-video-test-' + [guid]::NewGuid().ToString('N'))
$pool = Join-Path $tmp 'video_pool'; $receipts = Join-Path $tmp 'receipts'
[IO.Directory]::CreateDirectory($pool) | Out-Null; [IO.Directory]::CreateDirectory($receipts) | Out-Null
try {
  # Slot -> format.
  Assert-True ((Get-XCyclePostFormat '2026-10-31-2100') -ceq 'video') '21:00 KST slot posts a video'
  Assert-True ((Get-XCyclePostFormat '2026-11-01-0300') -ceq 'website_card') '03:00 KST slot stays a website card'
  Assert-True ((Get-XCyclePostFormat 'manual-2026-10-31-2100') -ceq 'website_card') 'non-scheduled cycle ids never switch to video'

  # Real pool is language-neutral mp4 only, outside the game bundle.
  $realClips = @(Get-XVideoClips)
  Assert-True ($realClips.Count -eq 3 -and @($realClips | Where-Object { $_ -match 'r3f_prototype' }).Count -eq 0) 'three real clips live in marketing video_pool, not the game bundle'

  # Clip rotation.
  foreach ($n in 'a','b','c') { [IO.File]::WriteAllText((Join-Path $pool "clip_$n.mp4"), "fixture $n") }
  $clip = @{}; $sha = @{}
  foreach ($n in 'a','b','c') { $clip[$n] = [IO.Path]::GetFullPath((Join-Path $pool "clip_$n.mp4")); $sha[$n] = (Get-FileHash -LiteralPath $clip[$n] -Algorithm SHA256).Hash.ToLowerInvariant() }
  function Write-VideoReceipt([string]$Id, [string]$Lang, [string]$Key, [string]$State = 'publish_intent') {
    $intent = New-XVideoIntent $Lang 'original' 'copy' 'copy' $clip[$Key] $sha[$Key]
    $r = [pscustomobject]@{ schema=1; cycleId=$Id; status='incomplete'; entries=[pscustomobject]@{ $Lang=[pscustomobject]@{ state=$State; intent=$intent; evidence=$null } } }
    Save-CycleReceipt $r (Join-Path $receipts ($Id + '.json'))
  }
  $dirs = @($receipts)
  # Old website-card and photo receipts (no videoSha256) must be ignored without crashing.
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'receipts\2026-10-15-0000.json') -Destination (Join-Path $receipts '2026-10-15-0000.json') -ErrorAction SilentlyContinue
  $card = [pscustomobject]@{ schema=1; cycleId='2026-10-28-0300'; entries=[pscustomobject]@{ en=[pscustomobject]@{ state='publish_intent'; intent=[pscustomobject]@{ language='en'; variantId='original'; text='t'; imagePath='x'; imageSha256=('0'*64); postFormat='website_card'; cardUrl='https://escapezombie.com/share/x/en/0000000000000000' }; evidence=$null } } }
  Save-CycleReceipt $card (Join-Path $receipts '2026-10-28-0300.json')
  Assert-True ((Select-XVideoClip en '2026-10-29-2100' $dirs $pool) -ceq $clip.a) 'no video history picks the first unused clip'
  Write-VideoReceipt '2026-10-29-2100' en a
  Write-VideoReceipt '2026-10-29-2101' en c 'selected'
  Assert-True ((Select-XVideoClip en '2026-10-30-2100' $dirs $pool) -ceq $clip.b) 'unused clips come first; a failed selected-only attempt is not history'
  Write-VideoReceipt '2026-10-30-2100' en b 'verified'
  Assert-True ((Select-XVideoClip en '2026-10-31-2100' $dirs $pool) -ceq $clip.c) 'third day uses the last unused clip'
  Write-VideoReceipt '2026-10-31-2100' en c
  Assert-True ((Select-XVideoClip en '2026-10-31-2100' $dirs $pool) -ceq $clip.c) 'the current cycle receipt is not its own history (frozen pick stays stable)'
  Assert-True ((Select-XVideoClip en '2026-11-01-2100' $dirs $pool) -ceq $clip.a) 'all used: least-recently-posted clip is reused'
  Write-VideoReceipt '2026-11-01-2100' en a
  $next = Select-XVideoClip en '2026-11-02-2100' $dirs $pool
  Assert-True ($next -ceq $clip.b -and $next -cne $clip.a) 'reuse never repeats the previous video and stays LRU'
  Assert-True ((Select-XVideoClip ko '2026-11-02-2100' $dirs $pool) -ceq $clip.a) 'rotation is per language'
  Remove-Item -LiteralPath $clip.b, $clip.c
  Assert-True ((Select-XVideoClip en '2026-11-02-2100' $dirs $pool) -ceq $clip.a) 'a single-clip pool still posts'
  Assert-Throws { Select-XVideoClip en '2026-11-02-2100' $dirs (Join-Path $tmp 'empty') } 'empty video pool fails closed'
  Assert-Throws { Resolve-XVideoClipPath (Join-Path $PSScriptRoot 'posting_config.json') } 'clip outside video_pool is refused'
  Assert-True ((Resolve-XVideoClipPath $realClips[0]) -ceq $realClips[0]) 'real clip resolves under video_pool'

  # Text: same localized variant copy, bare web URL + UTM, Play URL once, <=280 weighted.
  foreach ($lang in 'en','ko') {
    foreach ($variant in @(Get-PostingVariants $config $lang)) {
      $text = Get-XVideoComposerText $variant.text $config.web_url $config.play_store_url $lang
      $utm = 'https://escapezombie.com/?utm_source=x&utm_medium=social&utm_campaign=daily_' + $lang
      $ok = [regex]::Matches($text, [regex]::Escape($utm)).Count -eq 1 -and [regex]::Matches($text, [regex]::Escape($config.play_store_url)).Count -eq 1 -and -not $text.Contains('/share/x/') -and (Get-XWeightedLength $text) -le 280 -and $text.Replace($utm, $config.web_url) -ceq $variant.text
      if (-not $ok) { throw "FAILED video copy for $lang/$($variant.id)" }
    }
    Write-Output "PASS $lang video copy keeps the variant text, adds UTM once, keeps Play URL once, fits 280"
  }
  Assert-Throws { Get-XVideoComposerText 'no web url here' $config.web_url $config.play_store_url en } 'copy without the canonical web URL is refused'
  Assert-Throws { Get-XVideoComposerText (('x' * 300) + ' https://escapezombie.com ' + $config.play_store_url) $config.web_url $config.play_store_url en } 'overlong video copy is refused'

  # Receipt intent shape.
  $i = New-XVideoIntent en 'alarm' 'composer' 'source' $realClips[0] ('a' * 64) @('https://x.com/jungsilx/status/1') '2026-10-31T12:00:00Z'
  Assert-True ($i.postFormat -ceq 'video' -and $i.videoPath -ceq $realClips[0] -and $i.videoSha256 -ceq ('a' * 64) -and $i.attachmentCount -eq 1 -and $null -eq $i.cardUrl -and $null -eq $i.imagePath -and $i.textSha256 -ceq (Get-CopyDigest 'composer') -and @($i.baselineUrls).Count -eq 1) 'video intent carries postFormat/videoPath/videoSha256/attachmentCount=1/cardUrl=null'

  # Image rotation and previous-image lookup ignore video receipts gracefully.
  $imgDir = Join-Path $tmp 'img_receipts'; [IO.Directory]::CreateDirectory($imgDir) | Out-Null
  $baselinePick = Select-PostingLocaleImagePath $config en '2026-11-05-2100' $imgDir X $null @($imgDir)
  foreach ($state in 'publish_intent','selected') {
    $r = [pscustomobject]@{ schema=1; cycleId='2026-11-04-2100'; entries=[pscustomobject]@{ en=[pscustomobject]@{ state=$state; intent=(New-XVideoIntent en 'original' 'c' 'c' $realClips[0] ('b' * 64)); evidence=$null } } }
    Save-CycleReceipt $r (Join-Path $imgDir '2026-11-04-2100.json')
    Assert-True ((Select-PostingLocaleImagePath $config en '2026-11-05-2100' $imgDir X $null @($imgDir)) -ceq $baselinePick) "image rotation ignores a $state video receipt"
  }
  Assert-True ($null -eq (Get-PostingPreviousImagePath $config en '2026-11-05-2100' $imgDir @($baselinePick))) 'previous-image lookup skips video receipts'
  $copyOnly = Select-PostingVariant $config en '2026-11-05-2100' $imgDir -NoImage
  Assert-True ($null -eq $copyOnly.imagePath -and -not [string]::IsNullOrWhiteSpace($copyOnly.text)) 'video slot selects copy without consuming an image'

  # Runner: frozen video intent resolves back to its variant (no image-pool check).
  $runnerAst = [System.Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot 'Invoke-XDailyZombieSchoolPosting.ps1'), [ref]$null, [ref]$null)
  . ([scriptblock]::Create($runnerAst.Find({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq 'Resolve-XIntentVariant' }, $true).Extent.Text))
  $videoIntent = New-XVideoIntent en $copyOnly.id (Get-XVideoComposerText $copyOnly.text $config.web_url $config.play_store_url en) $copyOnly.text $realClips[0] ('c' * 64)
  Assert-True ((Resolve-XIntentVariant $config en $videoIntent).id -ceq $copyOnly.id) 'frozen video intent resolves to its variant'
  $videoIntent.sourceText = 'edited'
  Assert-Throws { Resolve-XIntentVariant $config en $videoIntent } 'edited video source copy is refused'
  $runnerSource = $runnerAst.Extent.Text
  Assert-True ($runnerSource.IndexOf('Save-CycleReceipt $receipt $receiptPath', $runnerSource.IndexOf("state='publish_intent'"), [StringComparison]::Ordinal) -lt $runnerSource.IndexOf('Publish-XPost -Text $composerText -Video', [StringComparison]::Ordinal)) 'publish_intent is persisted before the video submit'

  # UI layer with stubbed native adapters.
  $uiAst = [System.Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot 'WindowsXPosting.ps1'), [ref]$null, [ref]$null)
  foreach ($name in 'Publish-XPost','Prepare-XPost','Close-XOwnedDraft') { . ([scriptblock]::Create($uiAst.Find({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq $name }, $true).Extent.Text)) }
  $script:events = @()
  function Assert-XComposer([string]$Text, [switch]$WebsiteCardOnly, [string]$CardUrl = '') { $script:events += 'assert'; if ($script:attachments -ne 1) { throw 'Expected exactly one attached campaign image' }; if (-not $script:postEnabled) { throw 'Post button is disabled (length limit or upload pending)' } }
  function Find-XControl([string]$Name, [string]$Type = '', $Root = $null) { return $script:editor }
  function Click-XElement($Element) { $script:events += 'click' }
  function Submit-XEditorShortcut($Editor) { $script:events += 'ctrl+enter' }
  function Assert-XForeground { }
  function Get-XElements { return @([pscustomobject]@{ Current=[pscustomobject]@{ IsOffscreen=$false; Name='Your post was sent.' } }) }
  function Get-XAttachmentCount { return $script:attachments }
  function Get-XCardPreviewRemoveCount { return 0 }
  function Get-XValue($Element) { return $script:editor.Value }
  function Navigate-XProfile { }
  function Assert-XNavigationSafe { }
  function Set-XClipboardText([string]$Text) { $script:clipboard = $Text }
  function Send-XKeys([string]$Keys) { if ($Keys -eq '^v') { $script:editor.Value = $script:clipboard } }
  function Get-XWindowElement { return [pscustomobject]@{ Current=[pscustomobject]@{ NativeWindowHandle=321; ProcessId=654; Name='Profile (@jungsilx) / X - Chrome' } } }
  function Add-XVideoAttachment([string]$VideoPath) { $script:events += 'attach'; $script:attached = $VideoPath; $script:attachments = 1 }
  function Wait-XCondition([scriptblock]$Condition, [string]$Description, [int]$Seconds = 20) { $script:waits += "$Description/$Seconds"; if (-not (& $Condition)) { throw "Timed out: $Description" } }
  function Close-XOwnedDraft([string]$Text, [switch]$BeforePublish) { $script:events += "discard:$($script:XOwnedDraft.phase):$($script:XOwnedDraft.attachments)" }
  function Reset-Fixture { $script:events = @(); $script:waits = @(); $script:attachments = 0; $script:postEnabled = $true; $script:XOwnedDraft = $null; $script:editor = [pscustomobject]@{ Value=''; Current=[pscustomobject]@{ HasKeyboardFocus=$true } }; $script:editor | Add-Member ScriptMethod GetRuntimeId { return @(1, 2) } }
  Reset-Fixture
  $proof = Prepare-XPost -Text 'video copy' -VideoPath $realClips[0]
  Assert-True ($script:attached -ceq $realClips[0] -and $proof.postFormat -ceq 'video' -and $proof.attachmentCount -eq 1 -and $proof.videoSha256 -ceq (Get-FileHash -LiteralPath $realClips[0] -Algorithm SHA256).Hash.ToLowerInvariant()) 'prepare attaches exactly the frozen clip and returns its hash'
  Assert-True (@($script:waits | Where-Object { $_ -ceq 'video upload processed and Post enabled/180' }).Count -eq 1 -and @($script:events | Where-Object { $_ -match 'ctrl|discard' }).Count -eq 0) 'prepare waits up to 180s for processing and never submits'
  Reset-Fixture; $script:postEnabled = $false
  $err = ''; try { Prepare-XPost -Text 'video copy' -VideoPath $realClips[0] | Out-Null } catch { $err = $_.Exception.Message }
  Assert-True ($err -match 'Post button is disabled' -and ($script:events -join ',') -match 'discard:pre_publish_video:1$' -and ($script:events -notcontains 'ctrl+enter')) 'processing timeout throws before submit and hands the owned draft to pre-click cleanup'
  Reset-Fixture; $script:attachments = 1
  $out = Publish-XPost -Text 'video copy' -Video
  Assert-True ($out.outcome -ceq 'sent' -and @($script:events | Where-Object { $_ -ceq 'ctrl+enter' }).Count -eq 1 -and ($script:events -notcontains 'click')) 'video publish uses exactly one Ctrl+Enter, no synthetic Post click'
  Reset-Fixture; $script:attachments = 0
  Assert-Throws { Publish-XPost -Text 'video copy' -Video } 'video publish requires exactly one attachment'
  Assert-True ($script:events -notcontains 'ctrl+enter') 'missing attachment sends no submit'

  # Real pre-click cleanup accepts an owned video draft without any card URL.
  . ([scriptblock]::Create($uiAst.Find({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq 'Close-XOwnedDraft' }, $true).Extent.Text))
  Reset-Fixture; $script:attachments = 1; $script:editor.Value = 'video copy'; $script:XExpectedCardUrl = $null
  $script:XOwnedDraft = [pscustomobject]@{ text='video copy'; attachments=1; cards=0; phase='pre_publish_video'; windowId=321; processId=654; accountTitle='Profile (@jungsilx) / X - Chrome'; editorId='1,2' }
  Close-XOwnedDraft 'video copy' -BeforePublish
  Assert-True ($null -eq $script:XOwnedDraft -and @($script:events | Where-Object { $_ -ceq 'click' }).Count -eq 2) 'owned pre-click video draft is closed and discarded'
  $script:XOwnedDraft = [pscustomobject]@{ text='video copy'; attachments=1; cards=0; phase='pre_publish_video'; windowId=321; processId=654; accountTitle='Profile (@jungsilx) / X - Chrome'; editorId='1,2' }
  $script:attachments = 2; $script:events = @()
  Assert-Throws { Close-XOwnedDraft 'video copy' -BeforePublish } 'changed video draft is preserved'
  Assert-True ($script:events -notcontains 'click') 'preserved video draft receives no clicks'
  Write-Output 'X_VIDEO_POSTING_TEST_OK'
} finally { Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue }
