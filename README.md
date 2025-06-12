# Viable-full-stack-automation

This project automates the process of extracting invoice details from Gmail attachments, logs them to a sheet, and stores them in Google Drive.

---

## 📦 Setup Instructions

- Go to [Google Apps Script](https://script.google.com/)
- Create a new project
- Copy the main script into the `Code.gs` file

---

## 📄 Create Required Google Resources

### 🔹 Google Sheets
Create a new sheet and get the sharable link.  
It will look something like this:  
`https://docs.google.com/spreadsheets/d/{sheet-id}/edit?usp=sharing`

### 🔹 Google Drive
Create a new Google Drive folder and get the sharable link.  
It will look something like this:  
`https://drive.google.com/drive/folders/{folder-id}?usp=drive_link`

### 🔹 Gemini API Key (Free tier use only)
Go to [Google AI Studio](https://aistudio.google.com/) and generate a new API key.

---

## 🔐 Set Env Variables

Go to the script editor:
1. Click on **Project Settings** (in the sidebar)  
2. Scroll down to **Script Properties** (at the bottom)  
3. Add the following as key-value pairs:

   **`DRIVE_FOLDER_ID`** → `your-folder-id`  
   **`SHEET_ID`** → `your-sheet-id`  
   **`GEMINI_API_KEY`** → `your-gemini-api-key`

## ⏱️ Set Up Time-Based Triggers

In the script editor:

1. Go to the **Triggers** section in the left sidebar
2. Click **“+ Add Trigger”**
3. Set the following options:

- **Function**: `processViableEmails`
- **Event Source**: `Time-driven`
- **Type**: `Hour timer`
- **Interval**: `Every 4 hours`
