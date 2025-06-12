//env variables are hidden for coding best practices
const props = PropertiesService.getScriptProperties();
const DRIVE_FOLDER_ID = props.getProperty('DRIVE_FOLDER_ID');
const SHEET_ID = props.getProperty('SHEET_ID');
const GEMINI_API_KEY = props.getProperty('GEMINI_API_KEY');
const LABEL_NAME = 'Processed';

function processViableEmails() {
  const threads = GmailApp.search('subject:"Viable: Trial Document" -label:' + LABEL_NAME);
  const label = getOrCreateLabel(LABEL_NAME);
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();

  threads.forEach(thread => {
    const messages = thread.getMessages();
    messages.forEach(message => {
      const attachments = message.getAttachments();
      if (attachments.length === 0) return;  //Skipping emails without attachments

      attachments.forEach(file => {
        try {
          if (!isSupported(file)) return;

          const fileType = file.getContentType();

          //Handles the not availble in attachment, replaces it with N/A
          const rawData = extractDataWithGemini(file);
          const extractedData = {
            date: rawData.date || 'N/A',
            vendor: rawData.vendor || 'N/A',
            invoiceNo: rawData.invoiceNo || 'N/A',
            amount: rawData.amount || 'N/A'
          };

          const fileName = `${extractedData.date}_${extractedData.vendor}_${extractedData.invoiceNo}_${extractedData.amount}.${getFileExtension(file)}`;
          const savedFile = folder.createFile(file.copyBlob()).setName(fileName);
          const fileUrl = savedFile.getUrl();
          const timestamp = new Date();

          // adds extracted data to google sheeet
          sheet.appendRow([
            timestamp,
            extractedData.date,
            extractedData.invoiceNo,
            extractedData.amount,
            extractedData.vendor,
            fileUrl,
            fileType
          ]);

        } catch (error) {
          Logger.log("Error processing attachment: " + error);
        }
      });

      thread.markRead();
      thread.addLabel(label);
    });
  });
}

//adds if the email is processed or not
function getOrCreateLabel(name) {
  let label = GmailApp.getUserLabelByName(name);
  if (!label) {
    label = GmailApp.createLabel(name);
  }
  return label;
}
//Skipping unsupported files
function isSupported(file) {
  const supportedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  return supportedTypes.includes(file.getContentType());
}

//gets the extention of the file name
function getFileExtension(file) {
  return file.getName().split('.').pop();
}

//Using gemini flash2.0 to extract details from the bills
function extractDataWithGemini(file) {
  const base64Data = Utilities.base64Encode(file.getBytes());
  const mimeType = file.getContentType();


  //The Below prompt extracts only the final/total/net amount from the bills
  const promptText = `
You are an intelligent invoice parser. Extract the following fields from the attached document:
- date
- vendor
- invoiceNo
- amount

Use the final amount (like ‘Total’, ‘Net Amount’ or ‘Final Amount’) if multiple are present.

Respond only in this exact JSON format (without explanation):

{
  "date": "DD-MM-YYYY",
  "vendor": "Vendor Name",
  "invoiceNo": "INV123456",
  "amount": "Rs 40,000"
}
`;

  const payload = {
    contents: [{
      parts: [
        { text: promptText },
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        }
      ]
    }]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  const response = UrlFetchApp.fetch(url, options);
  const result = JSON.parse(response.getContentText());

  if (response.getResponseCode() !== 200) {
    throw new Error(`Gemini API error: ${response.getResponseCode()} - ${response.getContentText()}`);
  }

  let text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Strip backticks and 'json' if present
  text = text.trim().replace(/^```(?:json)?/, '').replace(/```$/, '').trim();

  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`Failed to parse JSON from Gemini response: ${text}`);    //Handling extraction error here
  }
}
