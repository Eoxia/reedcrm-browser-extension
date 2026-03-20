$path = 'c:\Users\laure\OneDrive\developpement\Doli-ReedCRM\content.js'
$lines = Get-Content $path -Encoding UTF8
$newlines = $lines[0..1185] + $lines[1349..($lines.count-1)]
Set-Content $path $newlines -Encoding UTF8
