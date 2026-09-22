# 🚛 Transport Management & Ledger System

A lightweight Transport Management & Financial Reconciliation application built specifically for transport operations, based on your **Shinex Excel data models**.

> **Note:** Designed to run using free-tier GitHub Pages and Google Apps Script/Google Sheets services. Provider free-tier limits and policies may change over time.

---

## 🚀 Key Features

1. **Continuous Data Logging:**
   - No need to split records by months or files. The application maintains all trips from April 2026 to March 2027 in one unified, searchable table.
2. **Dynamic Financial Accounting:**
   - **Automatic Balances:** `Balance = ToPay - Paid` is calculated automatically.
   - **Status Management:** Records auto-classify as `Paid`, `Partially Paid`, or `Pending`.
   - **Company Advances:** Tracks advance payments (RTGS, Cheques, NEFT) and adjusts them against total payable debt.
   - **Financial Reconciliation Formula:**
     $$\text{Net Outstanding} = (\text{Opening Balance} + \text{Total ToPay}) - (\text{Total Paid} + \text{Total Advances})$$
3. **In-Browser Excel Sync:**
   - **Download Excel:** Exports an exact 3-sheet workbook (`Transport Records`, `Advances`, `Financial Summary`) matching your Shinex format.
   - **Import Excel:** Batch imports existing `.xlsx` files into your database.
4. **Resilient Dual-Mode Storage:**
   - Works immediately offline using browser `localStorage`.
   - Syncs seamlessly to a private **Google Sheet** via **Google Apps Script** as a zero-cost serverless backend.
5. **Role-Based Access Control:**
   - **Admin (PIN: `7890`):** Full control (Add, Edit, Delete, Configure API, Adjust Opening Balance, Change PINs).
   - **Employee (PIN: `1234`):** Data entry & viewing (Add records, view reports; restricted from deleting).

---

## 📁 Project Structure

```text
D:\US\
├── index.html            # Main UI Dashboard & Login Screen
├── css\
│   └── styles.css        # Responsive, modern dashboard styling
├── js\
│   ├── api.js            # Dual storage bridge (Google Apps Script + LocalStorage)
│   ├── auth.js           # Session and PIN management (Admin vs Employee)
│   ├── transport.js      # Transport table rendering, filtering, and CRUD operations
│   ├── advances.js       # Advance payments management
│   ├── excel.js          # SheetJS Excel import/export logic
│   └── app.js            # Main application controller & dashboard metrics
├── backend\
│   └── Code.gs           # Google Apps Script Web App code for Google Sheets
└── README.md             # Setup guide and documentation
```

---

## 🛠️ Quick Start (Run Locally)

1. Double-click [index.html](file:///D:/US/index.html) to open it directly in Google Chrome, Microsoft Edge, or Firefox.
2. Choose your role:
   - **Admin:** Enter PIN `7890`
   - **Employee:** Enter PIN `1234`
3. You can immediately add transport trips, record advances, and test Excel downloads. Pre-seeded records from your Shinex Excel file are already included!

---

## ☁️ Zero-Cost Cloud Sync (Google Sheets Setup)

To have your data automatically save to a private Google Sheet that both Admin and Employee can access from anywhere:

1. Go to [Google Sheets](https://sheets.new) and create a new spreadsheet named **"Transport Management Data"**.
2. Rename the first tab to **`Transport`** and add a second tab named **`Advances`**.
3. In Google Sheets, click **Extensions** ➔ **Apps Script**.
4. Delete any code in the editor and copy-paste the entire contents of [Code.gs](file:///D:/US/backend/Code.gs).
5. Click **Deploy** ➔ **New deployment**:
   - **Select type:** Web app
   - **Description:** Transport API v1
   - **Execute as:** Me (`your-email@gmail.com`)
   - **Who has access:** Anyone
6. Click **Deploy**, authorize access, and copy your **Web App URL** (it looks like `https://script.google.com/macros/s/AKfycb.../exec`).
7. In your web application, log in as **Admin**, navigate to the **⚙️ Settings & API** tab, paste the URL into the **Google Apps Script Web App URL** field, and click **Save Configuration**.
8. That's it! Your app will now show **"Cloud Connected (Google Sheet)"** and sync all changes live.

---

## 🌐 Online Hosting Options

### Option 1: GitHub Pages (Direct & Simple)
1. Push your files to your GitHub repository (just like your `S-R` project):
   ```bash
   git init
   git add .
   git commit -m "Transport System v1"
   git remote add origin https://github.com/<your-username>/transport-system.git
   git push -u origin main
   ```
2. In your repository on GitHub, go to **Settings** ➔ **Pages**.
3. Under **Build and deployment**, select **Deploy from a branch** ➔ Branch: **`main`** / Folder: **`/(root)`** ➔ Click **Save**.
4. GitHub Pages will provide your live URL (e.g., `https://<your-username>.github.io/transport-system/`).

### Option 2: Vercel or Netlify (If hosting from a Private Repo on GitHub Free)
If your GitHub account is on the free tier and you require the repository to remain private:
1. Connect your private GitHub repo to [Vercel](https://vercel.com) or [Netlify](https://netlify.com) (both have free tiers).
2. Click **Import Repository** ➔ **Deploy**.
3. It will deploy your private repository to a free HTTPS URL without exposing your source code.


