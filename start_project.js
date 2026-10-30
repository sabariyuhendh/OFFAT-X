/**
 * OFFAT-X entry point
 * Starts the Express server and opens the browser automatically.
 * Usage: node start_project.js
 */
const { spawn, exec } = require('child_process');
const path = require('path');

const ROOT = __dirname;

console.log('\n  ╔════════════════════════════════╗');
console.log('  ║  OFFAT-X  Starting server…     ║');
console.log('  ╚════════════════════════════════╝\n');

const server = spawn('node', ['server.js'], { cwd: ROOT, stdio: 'inherit' });

server.on('error', function(err) {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});

setTimeout(function() {
  exec('start http://localhost:4000', function(err) {
    if (err) {
      console.log('Browser did not open. Visit: http://localhost:4000');
    }
  });
}, 1500);

process.on('SIGINT', function() { server.kill(); process.exit(); });