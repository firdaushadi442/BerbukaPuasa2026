export const APPSCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzfHLBCJw-6rMMGWzJ76M3iY1H6qdODaHZz-Iam9TUxlvPMUJcvZjUtVKKpFWOLGd7N8Q/exec';

export async function checkSubmissionStatus(familyName: string) {
  try {
    const response = await fetch(`${APPSCRIPT_URL}?action=checkStatus&familyName=${encodeURIComponent(familyName)}`, {
      method: 'GET',
      redirect: 'follow'
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking status:', error);
    // Return a specific error state that the UI can interpret
    return { success: false, submitted: false, error: 'fetch_failed' };
  }
}

export async function submitPayment(payload: any) {
  try {
    const response = await fetch(APPSCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'submitPayment',
        ...payload
      }),
      redirect: 'follow'
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error submitting payment:', error);
    throw new Error('Gagal menyambung ke pelayan. Sila pastikan Google Apps Script telah di-deploy dengan akses "Anyone".');
  }
}

export async function getSubmissions() {
  try {
    const response = await fetch(`${APPSCRIPT_URL}?action=getSubmissions`, {
      method: 'GET',
      redirect: 'follow'
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting submissions:', error);
    return { success: false, data: [], error: 'fetch_failed' };
  }
}

export async function updateSubmissionStatus(rowIndex: number, status: string) {
  try {
    const response = await fetch(APPSCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'updateStatus',
        rowIndex,
        status
      }),
      redirect: 'follow'
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating status:', error);
    throw new Error('Gagal menyambung ke pelayan. Sila pastikan Google Apps Script telah di-deploy dengan akses "Anyone".');
  }
}
