const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({
    keyFile: 'C://Users//mohit//OneDrive//Documents//Placement Cell Website//Placement-Backend//credentials//placement-cell-471921-ecf2ec0b814f.json', // Your key file
    scopes: ['https://www.googleapis.com/auth/drive']
});

async function listSharedDrives() {
    const drive = google.drive({ version: 'v3', auth });
    try {
        const res = await drive.drives.list({
            pageSize: 10
        });
        const drives = res.data.drives;
        if (drives && drives.length) {
            console.log('✅ Shared Drives accessible to the service account:');
            drives.forEach(d => console.log(`- ${d.name} (ID: ${d.id})`));
        } else {
            console.log('❌ No Shared Drives found. The account might only have access to regular folders.');
        }
    } catch (error) {
        console.error('Error listing drives:', error.message);
    }
}
listSharedDrives();