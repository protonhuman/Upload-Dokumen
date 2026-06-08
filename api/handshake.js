const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const MONTHS_MAP = {
  '01': '1. Januari',
  '02': '2. Februari',
  '03': '3. Maret',
  '04': '4. April',
  '05': '5. Mei',
  '06': '6. Juni',
  '07': '7. Juli',
  '08': '8. Agustus',
  '09': '9. September',
  '10': '10. Oktober',
  '11': '11. November',
  '12': '12. Desember'
};

const ROOT_FOLDER_ID = '1spc0LTd6Eak-AvwfhyCEHiYOP-LQl5MQ';

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const { teamLeader, date, shift, files } = req.body;

    if (!teamLeader || !date || !shift || !files || !Array.isArray(files)) {
      res.status(400).json({ error: 'Missing required parameters (teamLeader, date, shift, files)' });
      return;
    }

    // Parse date components
    // date comes in YYYY-MM-DD format
    const dateParts = date.split('-');
    if (dateParts.length !== 3) {
      res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD' });
      return;
    }
    const [year, month, day] = dateParts;
    const monthName = MONTHS_MAP[month] || `${month}`;

    // Get OAuth 2.0 credentials from environment variables
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      res.status(500).json({ 
        error: 'OAuth 2.0 Configuration Error', 
        message: 'Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REFRESH_TOKEN in environment variables.' 
      });
      return;
    }

    // Authenticate with Google API via OAuth 2.0
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    const tokenRes = await oauth2Client.getAccessToken();
    const accessToken = tokenRes.token;

    if (!accessToken) {
      throw new Error('Failed to retrieve access token from Google OAuth 2.0 Client');
    }

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Helper to find or create a folder
    async function getOrCreateFolder(folderName, parentId) {
      // Search for existing folder
      const listRes = await drive.files.list({
        q: `name = '${folderName.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id)',
        spaces: 'drive',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });

      if (listRes.data.files && listRes.data.files.length > 0) {
        return listRes.data.files[0].id;
      }

      // Create folder if not found
      const createRes = await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId]
        },
        fields: 'id',
        supportsAllDrives: true
      });

      return createRes.data.id;
    }

    // Create folder structure sequentially to avoid race conditions
    // 1. Year folder
    const yearFolderId = await getOrCreateFolder(year, ROOT_FOLDER_ID);
    // 2. Month folder
    const monthFolderId = await getOrCreateFolder(monthName, yearFolderId);
    // 3. Day folder
    const dayFolderId = await getOrCreateFolder(day, monthFolderId);
    // 4. Shift & Leader folder
    const shiftLeaderFolderName = `${shift} (${teamLeader})`;
    const finalFolderId = await getOrCreateFolder(shiftLeaderFolderName, dayFolderId);

    // Generate Resumable Upload Session URL for each file
    const fileUploadSessions = [];

    for (const file of files) {
      // Initiate resumable upload session on Google Drive API
      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': file.type || 'application/octet-stream'
        },
        body: JSON.stringify({
          name: file.name,
          parents: [finalFolderId]
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Google Drive API error when initiating session for ${file.name}: ${response.status} - ${errText}`);
      }

      const uploadUrl = response.headers.get('location');
      if (!uploadUrl) {
        throw new Error(`Did not receive Location header for resumable upload session of ${file.name}`);
      }

      fileUploadSessions.push({
        name: file.name,
        uploadUrl: uploadUrl
      });
    }

    // Return the response with upload session details and destination info
    res.status(200).json({
      success: true,
      destinationFolderId: finalFolderId,
      uploadSessions: fileUploadSessions
    });

  } catch (error) {
    console.error('Serverless Function Error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};
