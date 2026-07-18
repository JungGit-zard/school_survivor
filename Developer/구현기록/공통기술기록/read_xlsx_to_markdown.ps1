param(
    [Parameter(Mandatory = $true)]
    [string]$InputPath,

    [Parameter(Mandatory = $false)]
    [string]$OutputPath
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $InputPath)) {
    throw "Input file not found: $InputPath"
}

if (-not $OutputPath) {
    $directory = Split-Path -Parent $InputPath
    $name = [System.IO.Path]::GetFileNameWithoutExtension($InputPath)
    $OutputPath = Join-Path $directory "$name.readable.md"
}

Add-Type -AssemblyName System.IO.Compression.FileSystem

function Read-ZipEntryText {
    param(
        [System.IO.Compression.ZipArchive]$Zip,
        [string]$EntryName
    )

    $entry = $Zip.GetEntry($EntryName)
    if (-not $entry) {
        return $null
    }

    $stream = $entry.Open()
    try {
        $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
        try {
            return $reader.ReadToEnd()
        }
        finally {
            $reader.Dispose()
        }
    }
    finally {
        $stream.Dispose()
    }
}

function Convert-ColumnNameToIndex {
    param([string]$ColumnName)

    $index = 0
    foreach ($char in $ColumnName.ToUpperInvariant().ToCharArray()) {
        $index = ($index * 26) + ([int][char]$char - [int][char]'A' + 1)
    }
    return $index - 1
}

function Escape-MarkdownCell {
    param([string]$Value)

    if ($null -eq $Value) {
        return ""
    }

    return ($Value -replace "\|", "\|" -replace "`r?`n", "<br>")
}

function Get-CellValue {
    param(
        [System.Xml.XmlElement]$Cell,
        [string[]]$SharedStrings
    )

    $type = $Cell.GetAttribute("t")
    $valueNode = $Cell.ChildNodes | Where-Object { $_.LocalName -eq "v" } | Select-Object -First 1

    if ($type -eq "inlineStr") {
        $inlineText = ($Cell.ChildNodes | Where-Object { $_.LocalName -eq "is" } | Select-Object -First 1)
        if ($inlineText) {
            return $inlineText.InnerText
        }
        return ""
    }

    if (-not $valueNode) {
        return ""
    }

    $raw = $valueNode.InnerText

    if ($type -eq "s") {
        $sharedIndex = [int]$raw
        if ($sharedIndex -ge 0 -and $sharedIndex -lt $SharedStrings.Count) {
            return $SharedStrings[$sharedIndex]
        }
        return ""
    }

    return $raw
}

$zip = [System.IO.Compression.ZipFile]::OpenRead($InputPath)

try {
    [xml]$workbook = Read-ZipEntryText -Zip $zip -EntryName "xl/workbook.xml"
    [xml]$relationships = Read-ZipEntryText -Zip $zip -EntryName "xl/_rels/workbook.xml.rels"

    $sharedStrings = @()
    $sharedXmlText = Read-ZipEntryText -Zip $zip -EntryName "xl/sharedStrings.xml"
    if ($sharedXmlText) {
        [xml]$sharedXml = $sharedXmlText
        $sharedStrings = @(
            $sharedXml.GetElementsByTagName("si") | ForEach-Object {
                $_.InnerText
            }
        )
    }

    $relationshipById = @{}
    foreach ($relationship in $relationships.Relationships.Relationship) {
        $relationshipById[$relationship.Id] = $relationship.Target
    }

    $lines = New-Object System.Collections.Generic.List[string]
    $sourceName = [System.IO.Path]::GetFileName($InputPath)

    $lines.Add("# Readable Export: $sourceName")
    $lines.Add("")
    $lines.Add("Generated from ``$sourceName`` for AI/Codex-readable review.")
    $lines.Add("")

    foreach ($sheet in $workbook.workbook.sheets.sheet) {
        $sheetName = $sheet.name
        $relationshipId = $sheet.GetAttribute("id", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")
        $target = $relationshipById[$relationshipId]

        if (-not $target) {
            continue
        }

        $sheetEntry = if ($target.StartsWith("/")) {
            $target.TrimStart("/")
        }
        elseif ($target.StartsWith("xl/")) {
            $target
        }
        else {
            "xl/$target"
        }

        [xml]$sheetXml = Read-ZipEntryText -Zip $zip -EntryName $sheetEntry

        $rowData = @()
        $maxColumn = 0

        $rows = $sheetXml.GetElementsByTagName("*") | Where-Object { $_.LocalName -eq "row" }

        foreach ($row in $rows) {
            $cellsByColumn = @{}

            foreach ($cell in ($row.ChildNodes | Where-Object { $_.LocalName -eq "c" })) {
                $cellRef = $cell.GetAttribute("r")
                if ($cellRef -match "^([A-Z]+)") {
                    $columnIndex = Convert-ColumnNameToIndex -ColumnName $Matches[1]
                    $cellsByColumn[$columnIndex] = Get-CellValue -Cell $cell -SharedStrings $sharedStrings
                    if ($columnIndex -gt $maxColumn) {
                        $maxColumn = $columnIndex
                    }
                }
            }

            $rowData += ,$cellsByColumn
        }

        $lines.Add("## $sheetName")
        $lines.Add("")

        if ($rowData.Count -eq 0) {
            $lines.Add("_No readable rows._")
            $lines.Add("")
            continue
        }

        $columnCount = $maxColumn + 1
        $header = @()
        for ($column = 0; $column -lt $columnCount; $column++) {
            $headerValue = $rowData[0][$column]
            if ([string]::IsNullOrWhiteSpace($headerValue)) {
                $headerValue = "Column $($column + 1)"
            }
            $header += Escape-MarkdownCell $headerValue
        }

        $lines.Add("| " + ($header -join " | ") + " |")
        $lines.Add("| " + (($header | ForEach-Object { "---" }) -join " | ") + " |")

        for ($rowIndex = 1; $rowIndex -lt $rowData.Count; $rowIndex++) {
            $cells = @()
            for ($column = 0; $column -lt $columnCount; $column++) {
                $cells += Escape-MarkdownCell $rowData[$rowIndex][$column]
            }
            $lines.Add("| " + ($cells -join " | ") + " |")
        }

        $lines.Add("")
    }

    $outputDirectory = Split-Path -Parent $OutputPath
    if ($outputDirectory -and -not (Test-Path -LiteralPath $outputDirectory)) {
        New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
    }

    [System.IO.File]::WriteAllLines($OutputPath, $lines, [System.Text.UTF8Encoding]::new($false))
    Write-Host "Wrote readable markdown: $OutputPath"
}
finally {
    $zip.Dispose()
}
