Add-Type -AssemblyName System.Drawing

$outputDir = Join-Path $PSScriptRoot '..\docs\flowcharts'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$colors = @{
  Canvas = [Drawing.Color]::FromArgb(18, 22, 31)
  Lane = [Drawing.Color]::FromArgb(27, 33, 46)
  LaneAlt = [Drawing.Color]::FromArgb(23, 29, 40)
  Text = [Drawing.Color]::FromArgb(241, 245, 249)
  Muted = [Drawing.Color]::FromArgb(156, 163, 175)
  Browser = [Drawing.Color]::FromArgb(37, 99, 235)
  Api = [Drawing.Color]::FromArgb(139, 92, 246)
  Aws = [Drawing.Color]::FromArgb(245, 158, 11)
  Data = [Drawing.Color]::FromArgb(16, 185, 129)
  Worker = [Drawing.Color]::FromArgb(236, 72, 153)
  Decision = [Drawing.Color]::FromArgb(14, 165, 233)
  Danger = [Drawing.Color]::FromArgb(239, 68, 68)
  Line = [Drawing.Color]::FromArgb(100, 116, 139)
}

function New-Canvas([string]$title, [string]$subtitle) {
  $bitmap = New-Object Drawing.Bitmap 2400, 1500
  $graphics = [Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  $graphics.Clear($colors.Canvas)

  $titleFont = New-Object Drawing.Font 'Arial', 34, ([Drawing.FontStyle]::Bold)
  $subtitleFont = New-Object Drawing.Font 'Arial', 17, ([Drawing.FontStyle]::Regular)
  $graphics.DrawString($title, $titleFont, (New-Object Drawing.SolidBrush $colors.Text), 70, 42)
  $graphics.DrawString($subtitle, $subtitleFont, (New-Object Drawing.SolidBrush $colors.Muted), 72, 94)
  $titleFont.Dispose(); $subtitleFont.Dispose()
  return @($bitmap, $graphics)
}

function Get-RoundedPath([Drawing.RectangleF]$rect, [float]$radius) {
  $path = New-Object Drawing.Drawing2D.GraphicsPath
  $diameter = $radius * 2
  $path.AddArc($rect.X, $rect.Y, $diameter, $diameter, 180, 90)
  $path.AddArc($rect.Right - $diameter, $rect.Y, $diameter, $diameter, 270, 90)
  $path.AddArc($rect.Right - $diameter, $rect.Bottom - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($rect.X, $rect.Bottom - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function Draw-Lane($g, [float]$x, [float]$y, [float]$w, [float]$h, [string]$label, [Drawing.Color]$accent, [bool]$alternate = $false) {
  $rect = New-Object Drawing.RectangleF $x, $y, $w, $h
  $path = Get-RoundedPath $rect 18
  $fill = if ($alternate) { $colors.LaneAlt } else { $colors.Lane }
  $g.FillPath((New-Object Drawing.SolidBrush $fill), $path)
  $g.FillRectangle((New-Object Drawing.SolidBrush $accent), $x, $y, 10, $h)
  $font = New-Object Drawing.Font 'Arial', 15, ([Drawing.FontStyle]::Bold)
  $g.DrawString($label, $font, (New-Object Drawing.SolidBrush $accent), $x + 24, $y + 18)
  $font.Dispose(); $path.Dispose()
}

function Draw-Node($g, [float]$x, [float]$y, [float]$w, [float]$h, [string]$eyebrow, [string]$title, [string]$detail, [Drawing.Color]$accent) {
  $rect = New-Object Drawing.RectangleF $x, $y, $w, $h
  $path = Get-RoundedPath $rect 14
  $g.FillPath((New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(35, 42, 58))), $path)
  $g.DrawPath((New-Object Drawing.Pen $accent, 3), $path)
  $g.FillRectangle((New-Object Drawing.SolidBrush $accent), $x, $y, 9, $h)

  $eyebrowFont = New-Object Drawing.Font 'Arial', 11, ([Drawing.FontStyle]::Bold)
  $titleFont = New-Object Drawing.Font 'Arial', 16, ([Drawing.FontStyle]::Bold)
  $detailFont = New-Object Drawing.Font 'Arial', 12, ([Drawing.FontStyle]::Regular)
  $format = New-Object Drawing.StringFormat
  $format.Trimming = [Drawing.StringTrimming]::EllipsisWord
  $format.FormatFlags = [Drawing.StringFormatFlags]::LineLimit
  $g.DrawString($eyebrow.ToUpperInvariant(), $eyebrowFont, (New-Object Drawing.SolidBrush $accent), (New-Object Drawing.RectangleF ($x + 24), ($y + 14), ($w - 38), 22), $format)
  $g.DrawString($title, $titleFont, (New-Object Drawing.SolidBrush $colors.Text), (New-Object Drawing.RectangleF ($x + 24), ($y + 42), ($w - 38), 52), $format)
  $g.DrawString($detail, $detailFont, (New-Object Drawing.SolidBrush $colors.Muted), (New-Object Drawing.RectangleF ($x + 24), ($y + 96), ($w - 38), ($h - 106)), $format)
  $eyebrowFont.Dispose(); $titleFont.Dispose(); $detailFont.Dispose(); $format.Dispose(); $path.Dispose()
}

function Draw-Arrow($g, [float]$x1, [float]$y1, [float]$x2, [float]$y2, [string]$label = '') {
  $pen = New-Object Drawing.Pen $colors.Line, 4
  $pen.CustomEndCap = New-Object Drawing.Drawing2D.AdjustableArrowCap 6, 7
  $g.DrawLine($pen, $x1, $y1, $x2, $y2)
  if ($label) {
    $font = New-Object Drawing.Font 'Arial', 11, ([Drawing.FontStyle]::Bold)
    $midX = (($x1 + $x2) / 2) - 110
    $midY = (($y1 + $y2) / 2) - 25
    $g.FillRectangle((New-Object Drawing.SolidBrush $colors.Canvas), $midX, $midY, 220, 24)
    $format = New-Object Drawing.StringFormat
    $format.Alignment = [Drawing.StringAlignment]::Center
    $g.DrawString($label, $font, (New-Object Drawing.SolidBrush $colors.Muted), (New-Object Drawing.RectangleF $midX, $midY, 220, 24), $format)
    $format.Dispose(); $font.Dispose()
  }
  $pen.Dispose()
}

function Draw-Note($g, [float]$x, [float]$y, [float]$w, [float]$h, [string]$title, [string]$text, [Drawing.Color]$accent) {
  $rect = New-Object Drawing.RectangleF $x, $y, $w, $h
  $path = Get-RoundedPath $rect 12
  $g.FillPath((New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(29, 36, 49))), $path)
  $g.DrawPath((New-Object Drawing.Pen $accent, 2), $path)
  $titleFont = New-Object Drawing.Font 'Arial', 13, ([Drawing.FontStyle]::Bold)
  $textFont = New-Object Drawing.Font 'Arial', 11, ([Drawing.FontStyle]::Regular)
  $g.DrawString($title, $titleFont, (New-Object Drawing.SolidBrush $accent), $x + 18, $y + 14)
  $g.DrawString($text, $textFont, (New-Object Drawing.SolidBrush $colors.Muted), (New-Object Drawing.RectangleF ($x + 18), ($y + 44), ($w - 36), ($h - 54)))
  $titleFont.Dispose(); $textFont.Dispose(); $path.Dispose()
}

function Save-Canvas($bitmap, $graphics, [string]$name) {
  $graphics.Dispose()
  $path = Join-Path $outputDir $name
  $bitmap.Save($path, [Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
  Write-Output $path
}

# 1. Multipart upload
$canvas = New-Canvas '1. Multipart upload, resume, and deduplication' 'Control requests go through API Gateway + Lambda; video bytes travel directly from the browser to private Amazon S3.'
$bmp = $canvas[0]; $g = $canvas[1]
Draw-Lane $g 60 145 2280 285 'BROWSER / REACT' $colors.Browser $false
Draw-Lane $g 60 455 2280 475 'CONTROL PLANE / API GATEWAY + LAMBDA' $colors.Api $true
Draw-Lane $g 60 955 2280 390 'AWS DATA + STATE SERVICES' $colors.Aws $false

Draw-Node $g 130 220 340 150 'React' 'Select video + fingerprint' 'SHA-256 of stable file metadata. Used with ownerId for duplicate and resume lookup.' $colors.Browser
Draw-Node $g 650 220 390 150 'React -> API' 'POST /api/videos/uploads' 'Send originalName, contentType, size, and fingerprint using the authenticated API client.' $colors.Browser
Draw-Node $g 1240 220 360 150 'React' 'Upload missing 10 MiB parts' 'Skip part numbers already reconciled. Request a URL, PUT bytes, then report the ETag.' $colors.Browser
Draw-Node $g 1800 220 400 150 'React -> API' 'POST /:id/uploads/complete' 'Ask the API to assemble the source only after every expected part is present.' $colors.Browser
Draw-Arrow $g 470 295 650 295 ''
Draw-Arrow $g 1040 295 1240 295 'session'
Draw-Arrow $g 1600 295 1800 295 'all parts'

Draw-Node $g 120 535 360 165 'Lambda' 'Find ownerId + fingerprint' 'MongoDB decides: new upload, resume UPLOADING, or reuse an already uploaded video.' $colors.Api
Draw-Node $g 585 535 370 165 'Lambda -> S3' 'CreateMultipartUpload / ListParts' 'New: create uploadId. Resume: reconcile existing S3 parts as the source of truth.' $colors.Api
Draw-Node $g 1060 535 370 165 'Lambda' 'POST /:id/uploads/part' 'Without ETag: issue 15-minute presigned UploadPart URL. With ETag: verify through ListParts.' $colors.Api
Draw-Node $g 1535 535 370 165 'Lambda -> S3' 'CompleteMultipartUpload' 'Sort verified ETags and atomically assemble the final source object in S3.' $colors.Api
Draw-Node $g 2010 535 260 165 'Lambda' 'Queue work' 'Upsert one TranscodeJob and send only its ID to SQS.' $colors.Api
Draw-Arrow $g 480 617 585 617 ''
Draw-Arrow $g 955 617 1060 617 ''
Draw-Arrow $g 1430 617 1535 617 ''
Draw-Arrow $g 1905 617 2010 617 ''

Draw-Node $g 140 1030 390 170 'MongoDB' 'Video upload state' 'Stores uploadId, status, verified parts, fingerprint, source key, and active job reference.' $colors.Data
Draw-Node $g 690 1030 390 170 'Amazon S3' 'Private source object' 'Receives browser PUT requests through presigned URLs; returns an ETag for every part.' $colors.Aws
Draw-Node $g 1240 1030 390 170 'MongoDB' 'TranscodeJob PENDING' 'Unique video reference prevents a second job document for the same source video.' $colors.Data
Draw-Node $g 1790 1030 390 170 'Amazon SQS' 'Transcode queue' 'Carries { transcodeJobId }. Standard delivery is at least once; worker claim is idempotent.' $colors.Aws
Draw-Arrow $g 530 1115 690 1115 ''
Draw-Arrow $g 1080 1115 1240 1115 ''
Draw-Arrow $g 1630 1115 1790 1115 ''
Draw-Note $g 160 1235 2050 78 'Deduplication result' 'Matching UPLOADING video resumes missing parts. Matching UPLOADED video skips S3 re-upload. The ownerId boundary prevents one user from deduplicating against another user.' $colors.Decision
Save-Canvas $bmp $g '01-multipart-upload.png'

# 2. Transcoding
$canvas = New-Canvas '2. Queue-driven video processing and HLS transcoding' 'The long-running FFmpeg workload runs in an ECS/Fargate container; Lambda is not used for media processing.'
$bmp = $canvas[0]; $g = $canvas[1]
Draw-Lane $g 60 145 2280 330 'QUEUE + WORKER SCHEDULING' $colors.Aws $false
Draw-Lane $g 60 500 2280 505 'ECS TRANSCODER CONTAINER' $colors.Worker $true
Draw-Lane $g 60 1030 2280 315 'OUTPUT + DURABLE STATE' $colors.Data $false

Draw-Node $g 120 230 360 165 'Amazon SQS' 'ReceiveMessage long poll' 'ECS requests one message with a 20-second wait and a visibility timeout for processing.' $colors.Aws
Draw-Node $g 620 230 390 165 'Amazon ECS / Fargate' 'Worker task receives job ID' 'SST service keeps tasks running and supplies bucket, queue, MongoDB, FFmpeg, and temp-path settings.' $colors.Worker
Draw-Node $g 1150 230 390 165 'MongoDB' 'Atomic job claim' 'Change PENDING to PROCESSING. Duplicate SQS deliveries cannot claim a completed or active job.' $colors.Data
Draw-Node $g 1680 230 520 165 'ECS autoscaling' 'Service capacity: min 1, max 4' 'Current SST policy scales at 70% CPU and 75% memory; it does not scale from SQS queue depth.' $colors.Worker
Draw-Arrow $g 480 312 620 312 ''
Draw-Arrow $g 1010 312 1150 312 ''
Draw-Arrow $g 1540 312 1680 312 ''

Draw-Node $g 105 585 330 170 'Amazon S3' 'GetObject source' 'Download sources/<videoId>/original into the container temporary workspace.' $colors.Aws
Draw-Node $g 520 585 330 170 'ffprobe' 'Inspect source media' 'Read duration, video dimensions, codecs, and audio presence before choosing valid renditions.' $colors.Worker
Draw-Node $g 935 585 420 170 'FFmpeg' 'Encode adaptive renditions' 'Create eligible 360p, 480p, 720p, and 1080p streams with six-second HLS segments.' $colors.Worker
Draw-Node $g 1440 585 360 170 'Container disk' 'Build HLS package' 'Write master.m3u8, variant playlists, and .ts segments under a job-specific temp directory.' $colors.Worker
Draw-Node $g 1885 585 400 170 'Amazon S3' 'Upload HLS tree' 'Store all output below transcoded/<videoId>/ with correct playlist and segment content types.' $colors.Aws
Draw-Arrow $g 435 670 520 670 ''
Draw-Arrow $g 850 670 935 670 ''
Draw-Arrow $g 1355 670 1440 670 ''
Draw-Arrow $g 1800 670 1885 670 ''

Draw-Node $g 210 830 520 115 'Failure path' 'Keep SQS message for retry' 'On processing failure, mark the job FAILED; do not acknowledge the message before cleanup/error handling.' $colors.Danger
Draw-Node $g 930 830 520 115 'Success path' 'Mark TranscodeJob COMPLETED' 'Persist completion only after the entire HLS object tree has uploaded successfully.' $colors.Data
Draw-Node $g 1650 830 520 115 'Success path' 'DeleteMessage from SQS' 'Acknowledgement happens last, so accepted work is not lost before durable output exists.' $colors.Aws
Draw-Arrow $g 1450 887 1650 887 ''

Draw-Node $g 170 1095 520 165 'Private S3 prefix' 'transcoded/<videoId>/*' 'Contains the master playlist, relative variant playlists, and media segments used for playback.' $colors.Aws
Draw-Node $g 940 1095 520 165 'MongoDB' 'COMPLETED + output metadata' 'The API now reports playbackReady=true while Video remains UPLOADED as source-upload state.' $colors.Data
Draw-Node $g 1710 1095 520 165 'Playback handoff' 'CloudFront can serve HLS' 'The next browser status poll can obtain the master playlist URL and start playback.' $colors.Decision
Draw-Arrow $g 690 1177 940 1177 ''
Draw-Arrow $g 1460 1177 1710 1177 ''
Save-Canvas $bmp $g '02-video-transcoding.png'

# 3. Playback
$canvas = New-Canvas '3. Frontend adaptive HLS playback through CloudFront' 'The API authorizes the video and returns a master URL; playlists and segments then flow through the CDN, not through Lambda.'
$bmp = $canvas[0]; $g = $canvas[1]
Draw-Lane $g 60 145 2280 310 'DISCOVERY + AUTHORIZATION' $colors.Api $false
Draw-Lane $g 60 480 2280 475 'HLS DELIVERY PATH' $colors.Browser $true
Draw-Lane $g 60 980 2280 365 'ADAPTIVE PLAYBACK LOOP' $colors.Decision $false

Draw-Node $g 110 225 360 165 'React dashboard' 'GET /api/videos' 'Poll the owned video list and mount HlsPlayer only when playbackReady is true.' $colors.Browser
Draw-Node $g 580 225 400 165 'React -> API' 'GET /api/videos/:id/playback' 'Send the normal API authentication cookie. The request is for authorization and playback state only.' $colors.Browser
Draw-Node $g 1090 225 400 165 'API Gateway + Lambda' 'Check owner + COMPLETED job' 'Read MongoDB, reject missing/not-ready videos, and build the master manifest location.' $colors.Api
Draw-Node $g 1600 225 680 165 'Lambda -> React' 'Return CloudFront master URL' 'Example: https://<distribution>/transcoded/<videoId>/master.m3u8. Current design uses no signed cookie or key pair.' $colors.Api
Draw-Arrow $g 470 307 580 307 ''
Draw-Arrow $g 980 307 1090 307 ''
Draw-Arrow $g 1490 307 1600 307 ''

Draw-Node $g 100 565 350 170 'Video.js / VHS' 'Request master.m3u8' 'The player parses the variant bandwidth and resolution entries in the HLS master playlist.' $colors.Browser
Draw-Node $g 540 565 400 170 'Amazon CloudFront' 'Nearest edge checks cache' 'Cache hit: respond immediately. Cache miss: request the object from the private S3 origin.' $colors.Aws
Draw-Node $g 1030 565 400 170 'CloudFront OAC' 'Sign origin request' 'Origin Access Control allows only the distribution to read the private media-bucket objects.' $colors.Aws
Draw-Node $g 1520 565 350 170 'Private Amazon S3' 'Read HLS object' 'Return master playlist, variant playlist, or segment to CloudFront. Public access remains blocked.' $colors.Aws
Draw-Node $g 1960 565 340 170 'CloudFront edge' 'Cache + respond' 'Store cacheable HLS content at the edge and return it to Video.js over HTTPS.' $colors.Aws
Draw-Arrow $g 450 650 540 650 ''
Draw-Arrow $g 940 650 1030 650 'cache miss'
Draw-Arrow $g 1430 650 1520 650 ''
Draw-Arrow $g 1870 650 1960 650 ''

Draw-Node $g 160 805 510 105 'Relative HLS URLs' 'Variant playlists and segments use the same CDN prefix' 'No per-segment API call is required.' $colors.Decision
Draw-Node $g 850 805 510 105 'Fallback only' 'API playlist endpoints remain available' 'Used only when CLOUDFRONT_BASE_URL is absent.' $colors.Api
Draw-Node $g 1540 805 600 105 'Security boundary' 'The URL is currently keyless' 'Ownership is checked before URL discovery, but anyone who learns the URL can request it.' $colors.Danger

Draw-Node $g 120 1060 430 175 'Video.js ABR' 'Measure bandwidth + buffer' 'VHS continuously observes throughput, buffer health, viewport, and rendition availability.' $colors.Browser
Draw-Node $g 700 1060 430 175 'Video.js ABR' 'Choose a rendition' 'Start conservatively, step up when bandwidth is stable, and step down before rebuffering.' $colors.Decision
Draw-Node $g 1280 1060 430 175 'CloudFront' 'Fetch next .ts segment' 'Each relative request repeats the edge cache hit/miss flow without returning to the API.' $colors.Aws
Draw-Node $g 1860 1060 430 175 'HTML5 video' 'Append and play media' 'Media Source Extensions buffer decoded content while Video.js keeps requesting future segments.' $colors.Browser
Draw-Arrow $g 550 1147 700 1147 ''
Draw-Arrow $g 1130 1147 1280 1147 ''
Draw-Arrow $g 1710 1147 1860 1147 ''
Draw-Note $g 200 1255 2000 80 'Latency effect' 'After the first cache miss, nearby viewers receive cached HLS objects from the closest edge. This reduces S3-region round trips and keeps Lambda out of media delivery.' $colors.Decision
Save-Canvas $bmp $g '03-adaptive-playback.png'
