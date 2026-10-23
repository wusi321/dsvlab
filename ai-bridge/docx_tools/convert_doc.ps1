# convert_doc.ps1 —— 用本机 Word 转换文档格式（原文件不动）
# 用法: pwsh convert_doc.ps1 -Src <源文件> -Dst <目标文件> [-Format 16]
#   Format: 16 = .docx(默认)   0 = .doc(97-2003)   17 = PDF
param(
    [Parameter(Mandatory = $true)][string]$Src,
    [Parameter(Mandatory = $true)][string]$Dst,
    [int]$Format = 16
)
$Src = (Resolve-Path $Src).Path
$Dst = [System.IO.Path]::GetFullPath($Dst)
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open($Src)
    $doc.SaveAs2($Dst, $Format)
    "已转换: $Src -> $Dst"
    "页数={0} 字数={1} 内嵌图片={2} 表格={3} 浮动图形={4}" -f `
        $doc.ComputeStatistics(2), $doc.ComputeStatistics(0), $doc.InlineShapes.Count, $doc.Tables.Count, $doc.Shapes.Count
    $doc.Close(0)
}
finally {
    $word.Quit()
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word)
}
