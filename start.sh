#!/bin/bash
echo "=== QuantStock 启动脚本 ==="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到 python3，请先安装 Python 3.11+"
    exit 1
fi

# Check Node
if ! command -v node &> /dev/null; then
    echo "错误: 未找到 node，请先安装 Node.js 20+"
    exit 1
fi

# Backend
echo "📦 安装后端依赖..."
cd backend
python3 -m venv venv 2>/dev/null
source venv/bin/activate
pip install -r requirements.txt -q

echo "🚀 启动后端 (port 8000)..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Frontend
echo "📦 安装前端依赖..."
cd frontend
npm install -q

echo "🚀 启动前端 (port 3000)..."
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ QuantStock 已启动!"
echo "   前端: http://localhost:3000"
echo "   后端: http://localhost:8000/docs"
echo ""
echo "按 Ctrl+C 停止所有服务"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
