const { spawn } = require('child_process');
const path = require('path');

console.log('Starting Vehicle Recon Application...\n');

// Start the server
const serverProcess = spawn('node', [path.join(__dirname, 'server/server.js')], {
    stdio: 'inherit',
    shell: true
});

serverProcess.on('error', (error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log('\nShutting down...');
    serverProcess.kill();
    process.exit(0);
});
        startServer();
    });
} else {
    startServer();
}

function startServer() {
    console.log('🔧 Starting server...\n');
    
    const server = exec('node server/server.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Server error: ${error}`);
            return;
        }
    });
    
    server.stdout.on('data', (data) => {
        console.log(data.toString());
    });
    
    server.stderr.on('data', (data) => {
        console.error(data.toString());
    });
    
    // Open browser after a short delay
    setTimeout(() => {
        const url = 'http://localhost:3001';
        console.log(`\n🌐 Opening browser at ${url}`);
        
        const platform = process.platform;
        const command = platform === 'darwin' ? 'open' : 
                       platform === 'win32' ? 'start' : 'xdg-open';
        
        exec(`${command} ${url}`);
    }, 2000);
}

// Handle exit
process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down Vehicle Recon Application...');
    process.exit();
});
