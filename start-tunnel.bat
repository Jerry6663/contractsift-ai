@echo off
REM ContractSift AI Backend + Tunnel Startup Script
REM 将此脚本放到 Windows 启动文件夹或创建计划任务

cd /d "C:\Users\magic\.openclaw\workspace-dev-agent\contract-review-v2\backend"

echo [%date% %time%] Starting ContractSift AI Backend...

REM 1. Start backend server
start "ContractSift-Backend" /MIN node server.js

REM 2. Wait for backend to be ready
timeout /t 3 /nobreak >nul

REM 3. Start localtunnel
set NODE_PATH=C:\Users\magic\.workbuddy\binaries\node\workspace\node_modules
start "ContractSift-Tunnel" /MIN C:\Users\magic\.workbuddy\binaries\node\versions\22.22.2\node.exe -e "const lt=require('localtunnel');const fs=require('fs');(async()=>{const t=await lt({port:3098});fs.writeFileSync(process.env.TEMP+'/contractsift_tunnel_url.txt',t.url);console.log('Tunnel:',t.url);t.on('close',()=>{console.log('Tunnel closed, restarting...');process.exit(1)});})();"

echo [%date% %time%] ContractSift AI Backend started
echo Tunnel URL will be saved to %%TEMP%%\contractsift_tunnel_url.txt
