const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Vehicle Recon Setup...\n');

const checks = [];

// Check directories
const requiredDirs = ['server', 'public', 'data', 'data/uploads', 'data/archive'];
requiredDirs.forEach(dir => {
    const exists = fs.existsSync(path.join(__dirname, dir));
    checks.push({
        name: `Directory: ${dir}`,
        status: exists,
        fix: exists ? null : `Create directory: mkdir -p ${dir}`
    });
});

// Check files
const requiredFiles = [
    'server/server.js',
    'server/package.json',
    'public/index.html',
    'public/main_clean.js'
];
requiredFiles.forEach(file => {
    const exists = fs.existsSync(path.join(__dirname, file));
    checks.push({
        name: `File: ${file}`,
        status: exists,
        fix: exists ? null : `Missing file: ${file}`
    });
});

// Check for CSV file
const csvFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.csv'));
const publicCsvFiles = fs.existsSync(path.join(__dirname, 'public')) ? 
    fs.readdirSync(path.join(__dirname, 'public')).filter(f => f.endsWith('.csv')) : [];

checks.push({
    name: 'CSV inventory file',
    status: csvFiles.length > 0 || publicCsvFiles.length > 0,
    fix: csvFiles.length === 0 && publicCsvFiles.length === 0 ? 
        'No CSV file found. Copy your inventory CSV to the project folder.' : null
});

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
checks.push({
    name: `Node.js version (${nodeVersion})`,
    status: majorVersion >= 14,
    fix: majorVersion < 14 ? 'Update Node.js to version 14 or later' : null
});

// Display results
console.log('Setup Check Results:');
console.log('===================\n');

let hasIssues = false;
checks.forEach(check => {
    const icon = check.status ? '✅' : '❌';
    console.log(`${icon} ${check.name}`);
    if (!check.status && check.fix) {
        console.log(`   Fix: ${check.fix}`);
        hasIssues = true;
    }
});

console.log('\n===================');
if (hasIssues) {
    console.log('\n⚠️  Some issues found. Please fix them before starting the application.');
} else {
    console.log('\n✨ Everything looks good! You can start the application with:');
    console.log('   node start.js');
}
