@echo off
chcp 65001 >nul
echo =====================================================================
echo  ReProgFuturo - Configuração do Firewall do Windows para Rede Local
echo =====================================================================
echo.
echo Este script adiciona uma regra de entrada no Firewall do Windows
echo para permitir que alunos na mesma rede ou via Hairpin NAT acessem
echo o servidor ReProgFuturo na porta TCP 3000.
echo.
echo ATENÇÃO: Execute este arquivo clicando com botão direito e escolhendo
echo "Executar como Administrador".
echo.

:: Verifica privilégios de Administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Este script requer privilégios de Administrador!
    echo Por favor, execute o Prompt de Comando ou este arquivo como Administrador.
    echo.
    pause
    exit /b 1
)

echo [1/2] Verificando se a regra já existe...
netsh advfirewall firewall show rule name="ReProgFuturo Port 3000" >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Regra "ReProgFuturo Port 3000" já existe. Atualizando...
    netsh advfirewall firewall delete rule name="ReProgFuturo Port 3000" >nul
)

echo [2/2] Criando regra de permissão de entrada na porta TCP 3000...
netsh advfirewall firewall add rule name="ReProgFuturo Port 3000" dir=in action=allow protocol=TCP localport=3000 profile=any description="Permite acesso dos alunos ao servidor ReProgFuturo na porta 3000"

if %errorlevel% equ 0 (
    echo.
    echo =====================================================================
    echo [SUCESSO] Porta 3000 liberada com sucesso no Firewall do Windows!
    echo Dispositivos da rede local agora podem acessar o servidor pelo IP:
    echo Exemplo: http://192.168.1.47:3000
    echo =====================================================================
) else (
    echo.
    echo [ERRO] Falha ao adicionar regra no firewall.
)

echo.
pause

