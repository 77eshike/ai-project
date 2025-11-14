#!/bin/bash

case "$1" in
    start)
        echo "启动应用..."
        pm2 start ecosystem.config.js
        pm2 save
        ;;
    stop)
        echo "停止应用..."
        pm2 stop ai-project
        ;;
    restart)
        echo "重启应用..."
        pm2 restart ai-project
        ;;
    status)
        echo "应用状态:"
        pm2 status ai-project
        echo ""
        echo "端口监听:"
        netstat -tlnp | grep :3000 || echo "端口未监听"
        ;;
    logs)
        pm2 logs ai-project --lines 20
        ;;
    monitor)
        echo "实时监控 (Ctrl+C 退出):"
        pm2 monit
        ;;
    *)
        echo "用法: $0 {start|stop|restart|status|logs|monitor}"
        echo ""
        echo "start   - 启动应用"
        echo "stop    - 停止应用" 
        echo "restart - 重启应用"
        echo "status  - 查看状态"
        echo "logs    - 查看日志"
        echo "monitor - 实时监控"
        exit 1
esac
