module.exports = {
  apps: [
    {
      name: "voice-agent-local",
      script: "npm",
      args: "run dev",
      cwd: __dirname,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 2000,
      env: {
        NODE_ENV: "development",
        PORT: "3000",
      },
    },
  ],
};
