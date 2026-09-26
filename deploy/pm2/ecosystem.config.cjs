const path = require('path');
const isWindows = process.platform === 'win32';

// Path resolution relative to repository root
const rootDir = path.resolve(__dirname, '..', '..');
const backendDir = path.join(rootDir, 'backend');
const venvPython = isWindows
  ? path.join(backendDir, 'venv', 'Scripts', 'python.exe')
  : path.join(backendDir, 'venv', 'bin', 'python');

const venvGunicorn = path.join(backendDir, 'venv', 'bin', 'gunicorn');

module.exports = {
  apps: [
    {
      name: 'multitenant-backend',
      cwd: backendDir,
      script: isWindows ? venvPython : venvGunicorn,
      args: isWindows
        ? 'manage.py runserver 0.0.0.0:8000'
        : 'config.wsgi:application --bind 127.0.0.1:8000 --workers 3 --access-logfile - --error-logfile -',
      interpreter: 'none',
      env: {
        DJANGO_SETTINGS_MODULE: 'config.settings',
        PYTHONUNBUFFERED: '1',
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      time: true,
      instances: 1,
      exec_mode: 'fork',
      out_file: path.join(rootDir, 'logs', 'pm2-backend-out.log'),
      error_file: path.join(rootDir, 'logs', 'pm2-backend-error.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
