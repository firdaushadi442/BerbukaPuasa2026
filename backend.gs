const SHEET_ID = '15-p9HJgFquQhXEYGWJhnvCDOPJmOF1juBElWBEM6qfY';
const DRIVE_ID = '1tdj3obKp1YyqlUM0Nf_8nwHHSYdKe_i6';

function SetupDatabase() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('Submissions');
  if (!sheet) {
    sheet = ss.insertSheet('Submissions');
    sheet.appendRow(['Timestamp', 'FamilyName', 'Adults', 'Children', 'TotalAmount', 'ReceiptUrl', 'Status', 'ExtractedAmount']);
    sheet.getRange('A1:H1').setFontWeight('bold');
  } else {
    // Ensure ExtractedAmount column exists for older deployments
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (headers.indexOf('ExtractedAmount') === -1) {
      sheet.getRange(1, headers.length + 1).setValue('ExtractedAmount');
      sheet.getRange(1, headers.length + 1).setFontWeight('bold');
    }
  }
}

function doPost(e) {
  // Handle CORS preflight
  if (typeof e === 'undefined') {
    return ContentService.createTextOutput(JSON.stringify({ error: 'No data' })).setMimeType(ContentService.MimeType.JSON);
  }
  
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === 'submitPayment') {
      return submitPayment(data);
    } else if (action === 'updateStatus') {
      return updateStatus(data);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Invalid action' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action;

    if (action === 'getSubmissions') {
      return getSubmissions();
    } else if (action === 'checkStatus') {
      return checkStatus(e.parameter.familyName);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Invalid action' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function submitPayment(data) {
  const { familyName, adults, children, totalAmount, receiptBase64, mimeType, filename, status, extractedAmount } = data;

  // Check if already submitted
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('Submissions');
  if (!sheet) {
    SetupDatabase();
    sheet = ss.getSheetByName('Submissions');
  }
  
  const dataRange = sheet.getDataRange().getValues();
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][1] === familyName) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Keluarga ini telah menghantar resit pembayaran.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Upload file to Drive
  const folder = DriveApp.getFolderById(DRIVE_ID);
  const blob = Utilities.newBlob(Utilities.base64Decode(receiptBase64), mimeType, filename);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const receiptUrl = file.getUrl();

  // Save to Sheet
  const finalStatus = status || 'MENUNGGU PENGESAHAN';
  const finalExtractedAmount = extractedAmount || '';
  sheet.appendRow([new Date().toISOString(), familyName, adults, children, totalAmount, receiptUrl, finalStatus, finalExtractedAmount]);

  return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Pembayaran berjaya dihantar.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSubmissions() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Submissions');
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] })).setMimeType(ContentService.MimeType.JSON);

  const dataRange = sheet.getDataRange().getValues();
  if (dataRange.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const headers = dataRange[0];
  const submissions = [];

  for (let i = 1; i < dataRange.length; i++) {
    const row = dataRange[i];
    const submission = {};
    for (let j = 0; j < headers.length; j++) {
      submission[headers[j]] = row[j];
    }
    submission.rowIndex = i + 1; // 1-based index for updating
    submissions.push(submission);
  }

  // Sort by newest first
  submissions.reverse();

  return ContentService.createTextOutput(JSON.stringify({ success: true, data: submissions }))
    .setMimeType(ContentService.MimeType.JSON);
}

function checkStatus(familyName) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Submissions');
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ success: true, submitted: false })).setMimeType(ContentService.MimeType.JSON);

  const dataRange = sheet.getDataRange().getValues();
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][1] === familyName) {
      return ContentService.createTextOutput(JSON.stringify({ success: true, submitted: true, status: dataRange[i][6] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ success: true, submitted: false }))
    .setMimeType(ContentService.MimeType.JSON);
}

function updateStatus(data) {
  const { rowIndex, status } = data;
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Submissions');
  sheet.getRange(rowIndex, 7).setValue(status); // Column G is Status

  return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Status berjaya dikemaskini.' }))
    .setMimeType(ContentService.MimeType.JSON);
}
