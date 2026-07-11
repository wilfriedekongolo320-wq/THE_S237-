module.exports = {
  apps: [
    {
      name: 'katashie-web',
      script: 'dist/server/index.js',
      cwd: '/opt/katashie-web',
      env: {
        NODE_ENV: 'production',
        PORT: '2087',
        KATASHIE_DB_DIR: '/etc/katashie-web',
        NEXUS_ADMIN_USER: 'admin',
        NEXUS_ADMIN_PASS: 'admin',
        NEXUS_JWT_SECRET: 'change-me'
      },
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 3000
    }
  ]
};
