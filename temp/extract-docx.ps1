Add-Type -AssemblyName System.IO.Compression.FileSystem

function Extract-DocxText {
    param([string]$FilePath, [string]$OutPath)
    try {
        $zip = [System.IO.Compression.ZipFile]::OpenRead($FilePath)
        $entry = $zip.Entries | Where-Object { $_.Name -eq 'document.xml' }
        if ($entry) {
            $stream = $entry.Open()
            $reader = New-Object System.IO.StreamReader($stream)
            $content = $reader.ReadToEnd()
            $reader.Close()
            $stream.Close()
            # Extract text from XML
            [xml]$xml = $content
            $ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
            $ns.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
            $texts = $xml.SelectNodes('//w:t', $ns)
            $result = ($texts | ForEach-Object { $_.InnerText }) -join " "
            $result | Out-File -FilePath $OutPath -Encoding UTF8
            Write-Host "Extracted to $OutPath"
        }
        $zip.Dispose()
    } catch {
        Write-Host "Error: $_"
    }
}

$base = 'C:\Users\64887\ocr-kb-matcher\study-material\Q3\U5'
Extract-DocxText -FilePath "$base\Week 4\Ming Culture Stations.docx" -OutPath "$base\Week 4\Ming_Culture_Stations.txt"
Extract-DocxText -FilePath "$base\Week 3\Mughal Land Reading EAL.docx" -OutPath "$base\Week 3\Mughal_Land_Reading_EAL.txt"
Extract-DocxText -FilePath "$base\Week 3\Mughal Art Images.docx" -OutPath "$base\Week 3\Mughal_Art_Images.txt"
