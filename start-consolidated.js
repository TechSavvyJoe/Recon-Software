#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚗 Vehicle Reconditioning Tracker Startup');
console.log('==========================================');

// Check if we're in the right directory
const projectRoot = path.join(__dirname);
const serverDir = path.join(projectRoot, 'server');

// Check for consolidated files first
const useConsolidated = fs.existsSync(path.join(projectRoot, 'index-consolidated.html')) && 
                        fs.existsSync(path.join(projectRoot, 'main-consolidated.js')) &&
                        fs.existsSync(path.join(serverDir, 'server-consolidated.js'));

if (useConsolidated) {
    console.log('✅ Using consolidated files (recommended)');
    
    // Copy consolidated files to main locations
    try {
        if (fs.existsSync(path.join(projectRoot, 'index-consolidated.html'))) {
            fs.copyFileSync(
                path.join(projectRoot, 'index-consolidated.html'), 
                path.join(projectRoot, 'index.html')
            );
        }
        
        if (fs.existsSync(path.join(projectRoot, 'main-consolidated.js'))) {
            fs.copyFileSync(
                path.join(projectRoot, 'main-consolidated.js'), 
                path.join(projectRoot, 'main.js')
            );
        }
        
        if (fs.existsSync(path.join(serverDir, 'server-consolidated.js'))) {
            fs.copyFileSync(
                path.join(serverDir, 'server-consolidated.js'), 
                path.join(serverDir, 'server.js')
            );
        }
        
        if (fs.existsSync(path.join(serverDir, 'package-consolidated.json'))) {
            fs.copyFileSync(
                path.join(serverDir, 'package-consolidated.json'), 
                path.join(serverDir, 'package.json')
            );
        }
        
        console.log('📁 Consolidated files copied to main locations');
    } catch (error) {
        console.warn('⚠️  Warning: Could not copy consolidated files:', error.message);
    }
} else {
    console.log('📁 Using existing files');
}

// Check if Node modules are installed
const serverPackageJson = path.join(serverDir, 'package.json');
const nodeModules = path.join(serverDir, 'node_modules');

if (!fs.existsSync(nodeModules) && fs.existsSync(serverPackageJson)) {
    console.log('📦 Installing server dependencies...');
    
    const npm = spawn('npm', ['install'], {
        cwd: serverDir,
        stdio: 'inherit',
        shell: true
    });
    
    npm.on('close', (code) => {
        if (code === 0) {
            console.log('✅ Dependencies installed');
            startServer();
        } else {
            console.error('❌ Failed to install dependencies');
            process.exit(1);
        }
    });
} else {
    startServer();
}

function startServer() {
    console.log('🚀 Starting server...');
    
    const serverFile = path.join(serverDir, 'server.js');
    
    if (!fs.existsSync(serverFile)) {
        console.error('❌ Server file not found:', serverFile);
        console.log('Available files in server directory:');
        try {
            const files = fs.readdirSync(serverDir);
            files.forEach(file => console.log(`   - ${file}`));
        } catch (e) {
            console.log('   (Could not read server directory)');
        }
        process.exit(1);
    }
    
    const server = spawn('node', [serverFile], {
        cwd: serverDir,
        stdio: 'inherit'
    });
    
    server.on('close', (code) => {
        console.log(`Server exited with code ${code}`);
    });
    
    server.on('error', (error) => {
        console.error('❌ Failed to start server:', error);
    });
    
    // Handle process termination
    process.on('SIGINT', () => {
        console.log('\n👋 Shutting down server...');
        server.kill();
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        console.log('\n👋 Shutting down server...');
        server.kill();
        process.exit(0);
    });
}
