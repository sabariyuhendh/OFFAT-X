#!/usr/bin/env node
/**
 * OFFAT-X entry point
 * Starts the Express server, then opens the browser automatically.
 * Usage: node start_project.js
 */
'use strict';
const { spawn, exec } = require('child_process');
const path = require('path');

const ROOT = __dirname;

console.log('\n  Starting OFFAT-X Web Server…\n');

const server = spawn('node', ['server.js'], {
  cwd: ROOT,
  stdio: 'inherit',
});

server.on('error', (err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});

// Wait 1.5 s for Express to bind, then open the browser
setTimeout(() => {
  exec('start http://localhost:4000', (err) => {
    if (err) {
      console.log('Could not auto-open browser. Visit: http://localhost:4000');
    }
  });
}, 1500);

process.on('SIGINT', () => { server.kill(); process.exit(); });
