// PM2 Ecosystem Config for Lomix Next.js
// https://pm2.keymetrics.io/docs/usage/application-declaration/
//
// Usage:
//   pm2 start ecosystem.config.js          # Start/restart
//   pm2 reload ecosystem.config.js         # Zero-downtime reload
//   pm2 stop lomix-next                    # Stop
//   pm2 delete lomix-next                  # Remove from PM2
//   pm2 logs lomix-next                    # View logs
//   pm2 monit                              # Monitor
//
// Build + Start manually:
//   pm2 start ecosystem.config.js --only lomix-next-build
//   pm2 start ecosystem.config.js --only lomix-next

module.exports = {
    apps: [
        {
            name: 'lomix-next',
            script: 'node_modules/next/dist/bin/next',
            args: 'start',
            cwd: __dirname,
            instances: 1,               // Tek instance (Next.js handles clustering internally if needed)
            exec_mode: 'fork',          // Fork mode (not cluster, since Next.js has its own)
            env: {
                NODE_ENV: 'production',
                PORT: 3001,
            },
            // Restart behavior
            min_uptime: '10s',          // Minimum uptime before considering app stable
            max_restarts: 10,           // Max restarts in a row
            restart_delay: 3000,        // Wait 3 seconds between restarts
            exp_backoff_restart_delay: 100, // Exponential backoff starting at 100ms
            // Logging
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            error_file: './logs/pm2-error.log',
            out_file: './logs/pm2-out.log',
            merge_logs: true,
            // Graceful shutdown
            kill_timeout: 5000,         // Wait 5s for graceful shutdown
            listen_timeout: 30000,      // Wait 30s for app to start listening
            // Watch (disabled by default, enable for development)
            watch: false,
        },
        // Optional: Build-only task (run once before starting)
        // {
        //   name: 'lomix-next-build',
        //   script: 'npm',
        //   args: 'run build',
        //   cwd: __dirname,
        //   env: {
        //     NODE_ENV: 'production',
        //   },
        //   autorestart: false,       // Don't restart after build completes
        // }
    ],
};
