module.exports = {
  apps: [
    {
      name: 'agentic-ai-backend',
      script: './server.js',
      instances: 'max', // Cluster mode: utilize all CPU cores on Ubuntu server
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 6007,
        BASE_API: '/cseAI'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 6007,
        BASE_API: '/cseAI'
      },
      // Process resilience configuration
      max_memory_restart: '500M',
      restart_delay: 3000,
      max_restarts: 10,
      autorestart: true,
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true
    }
  ]
};
