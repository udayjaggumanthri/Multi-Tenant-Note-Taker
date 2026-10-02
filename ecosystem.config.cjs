/**
 * PM2 Ecosystem Configuration for Multi-Tenant Note Taker
 * 
 * Works seamlessly on both Linux VPS (production with Gunicorn)
 * and Windows/local (development with Django runserver).
 * 
 * Commands:
 *   pm2 start ecosystem.config.cjs
 *   pm2 restart multitenant-backend
 *   pm2 logs multitenant-backend
 *   pm2 status
 *   pm2 stop all
 */

const path = require('path');
const isWindows = process.platform === 'win32';

// Path resolution
const backendDir = path.resolve(__dirname, 'backend');
const venvPython = isWindows
  ? path.join(backendDir, 'venv', 'Scripts', 'python.exe')
  : path.join(backendDir, 'venv', 'bin', 'python');

const venvGunicorn = path.join(backendDir, 'venv', 'bin', 'gunicorn');

module.exports = {
  apps: [
    {
      name: 'multitenant-backend',
      cwd: backendDir,
      // On Linux production: Run Gunicorn WSGI server
      // On Windows local: Run Django runserver
      script: isWindows ? venvPython : venvGunicorn,
      args: isWindows
        ? 'manage.py runserver 0.0.0.0:8000'
        : 'config.wsgi:application --bind 0.0.0.0:8000 --workers 3 --access-logfile - --error-logfile -',
      interpreter: 'none',
      env: {
        DJANGO_SETTINGS_MODULE: 'config.settings',
        PYTHONUNBUFFERED: '1',
      },
      // Reliability & Process Management
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      time: true,
      instances: 1,
      exec_mode: 'fork',
      out_file: path.join(__dirname, 'logs', 'pm2-backend-out.log'),
      error_file: path.join(__dirname, 'logs', 'pm2-backend-error.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'multitenant-frontend',
      cwd: path.resolve(__dirname, 'frontend'),
      script: 'npm',
      args: 'run dev -- --host 0.0.0.0 --port 5173',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      time: true,
      out_file: path.join(__dirname, 'logs', 'pm2-frontend-out.log'),
      error_file: path.join(__dirname, 'logs', 'pm2-frontend-error.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
