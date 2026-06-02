$c = Get-Content 'app.js' -Encoding UTF8
$c = $c -replace 'Ã“','Ó' -replace 'Ã³','ó' -replace 'Ã¡','á' -replace 'Ã©','é' -replace 'Ã­','í' -replace 'Ã±','ñ' -replace 'Ãº','ú' -replace 'âœ…','✓' -replace 'âŒ','❌' -replace 'âš ï¸','⚠️' -replace 'â„¹ï¸','ℹ️' -replace 'âœ”','”' -replace 'âœ‘','‘' -replace 'Â¿','¿' -replace 'Â¡','¡'
Set-Content 'app.js' -Value $c -Encoding UTF8