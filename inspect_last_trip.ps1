$res = Invoke-RestMethod 'https://script.google.com/macros/s/AKfycbwnxIOGOYUzCfrdcbsw1kvD1x_bWwHp57Y_KJBnHBJB9pxK9d8SOhjufYwBHh3R0Dro/exec?action=getAll'
$t = $res.data.transport
$last = $t[$t.Count - 1]
Write-Host ($last | ConvertTo-Json)

