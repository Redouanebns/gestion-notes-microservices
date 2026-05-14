#auth-service-tester 
1-curl http://localhost:4001/health

2-Invoke-RestMethod -Uri "http://localhost:4001/api/auth/register" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body '{"name":"Teacher One","email":"teacher@test.com","password":"123456","role":"teacher"}'

3-Invoke-RestMethod -Uri "http://localhost:4001/api/auth/login" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body '{"email":"teacher@test.com","password":"123456"}'

4-$response = Invoke-RestMethod -Uri "http://localhost:4001/api/auth/login" `
-Method POST `
-Headers @{ "Content-Type" = "application/json" } `
-Body '{"email":"teacher@test.com","password":"123456"}'

$token = $response.token   ##copie token

5-Invoke-RestMethod -Uri "http://localhost:4001/api/auth/profile" `
-Method GET `
-Headers @{ "Authorization" = "Bearer $token" } ##protected